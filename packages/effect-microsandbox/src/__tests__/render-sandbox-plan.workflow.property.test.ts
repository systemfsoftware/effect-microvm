import { it } from '@systemfsoftware/vitest'
import { Match, Option, Schema } from 'effect'
import * as Arbitrary from 'effect/Arbitrary'
import * as Arr from 'effect/Array'
import * as Result from 'effect/Result'
import { GuestPort, JobSpec, MicroVMSpec, ServiceSpec } from '../MicroVMSpec.schema.js'
import { PortBinding, SandboxPlan } from '../render-sandbox-plan.schema.js'
import { PlanRefused, PlanSandbox, renderSandboxPlan } from '../render-sandbox-plan.workflow.js'

type Render = typeof renderSandboxPlan

const holds = (clauses: ReadonlyArray<boolean>): boolean => clauses.every((clause) => clause)

const isLoopbackHost = (host: string): boolean => [host === '127.0.0.1', host.startsWith('127.')].some(Boolean)

const planLaw = (render: Render, command: PlanSandbox, law: (plan: SandboxPlan) => boolean): boolean =>
  Result.match(render(command), {
    onFailure: () => false,
    onSuccess: (decision) =>
      Match.value(decision).pipe(
        Match.tag('PlanApproved', ({ plan }) => law(plan)),
        Match.tag('PlanRefused', () => false),
        Match.exhaustive,
      ),
  })

const refusalLaw = (render: Render, command: PlanSandbox, law: (refused: PlanRefused) => boolean): boolean =>
  Result.match(render(command), {
    onFailure: () => false,
    onSuccess: (decision) =>
      Match.value(decision).pipe(
        Match.tag('PlanApproved', () => false),
        Match.tag('PlanRefused', (refused) => law(refused)),
        Match.exhaustive,
      ),
  })

const octet = Arbitrary.schema(Schema.Int.pipe(Schema.check(Schema.isBetween({ minimum: 0, maximum: 255 }))))
const guestPortArb = Arbitrary.schema(GuestPort)
const loopbackHost = Arbitrary.map(Arbitrary.all([octet, octet, octet]), ([a, b, c]) => `127.${a}.${b}.${c}`)

const outsideOctet = Arbitrary.map(octet, (value) => (value === 127 ? 126 : value))
const outsideHost = Arbitrary.map(
  Arbitrary.all([outsideOctet, octet, octet, octet]),
  ([a, b, c, d]) => `${a}.${b}.${c}.${d}`,
)

const loopbackBinding = Arbitrary.map(
  Arbitrary.all([guestPortArb, loopbackHost, guestPortArb]),
  ([guest, host, hostPort]): PortBinding => ({ guest, host, hostPort }),
)
const outsideBinding = Arbitrary.map(
  Arbitrary.all([guestPortArb, outsideHost, guestPortArb]),
  ([guest, host, hostPort]): PortBinding => ({ guest, host, hostPort }),
)
const loopbackBindings = Arbitrary.array(loopbackBinding, { maxLength: 4 })

const successCase = Arbitrary.map(
  Arbitrary.all([
    Arbitrary.schema(MicroVMSpec),
    loopbackBindings,
    Arbitrary.schema(Schema.Int),
    Arbitrary.schema(Schema.String),
  ]),
  ([spec, bindings, pid, suffix]): PlanSandbox => new PlanSandbox({ spec, bindings, name: `sandbox-${pid}-${suffix}` }),
)

const refusalCase = Arbitrary.map(
  Arbitrary.all([
    Arbitrary.schema(MicroVMSpec),
    loopbackBindings,
    outsideBinding,
    Arbitrary.schema(Schema.Int),
    Arbitrary.schema(Schema.String),
  ]),
  ([spec, loopbacks, outside, pid, suffix]): Readonly<{ command: PlanSandbox; offender: PortBinding }> => ({
    command: new PlanSandbox({ spec, bindings: [...loopbacks, outside], name: `sandbox-${pid}-${suffix}` }),
    offender: outside,
  }),
)

const cmdEchoes = (plan: SandboxPlan, cmd: ReadonlyArray<string> | undefined): boolean =>
  Option.match(Option.fromNullishOr(cmd), {
    onNone: () => plan.cmd === undefined,
    onSome: (someCmd) =>
      Option.match(Option.fromNullishOr(plan.cmd), {
        onNone: () => false,
        onSome: (planCmd) => holds([planCmd.length === someCmd.length, planCmd.every((arg, i) => arg === someCmd[i])]),
      }),
  })

it.prop(
  '∀outside_Render_=Refused',
  { of: [refusalCase], subject: renderSandboxPlan },
  (subject, [{ command, offender }]) =>
    refusalLaw(subject, command, (refused) =>
      holds([
        refused.sandboxName === command.name,
        refused.host === offender.host,
        refused.guestPort === offender.guest,
      ])),
)

it.prop(
  '∀loopback_Render_=Approved',
  { of: [successCase], subject: renderSandboxPlan },
  (subject, [command]) =>
    planLaw(subject, command, (plan) => {
      const allLoopback = plan.portBindings.every((b) => isLoopbackHost(b.host))
      const roleCorrect = Match.value(command.spec).pipe(
        Match.tag('Service', (service) =>
          holds([
            plan.portBindings.length === command.bindings.length,
            cmdEchoes(plan, service.cmd),
            plan.workdir === undefined,
          ])),
        Match.tag('Job', (job) =>
          holds([
            plan.portBindings.length === 0,
            cmdEchoes(plan, job.cmd),
            plan.workdir === job.workdir,
          ])),
        Match.exhaustive,
      )
      return holds([allLoopback, roleCorrect])
    }),
)

const guestsDecided = (command: PlanSandbox, guests: ReadonlyArray<number>): boolean =>
  Match.value(command.spec).pipe(
    Match.tag('Service', (service) =>
      holds([guests.length === service.ports.length, service.ports.every((port, i) => guests[i] === port)])),
    Match.tag('Job', () =>
      guests.length === 0),
    Match.exhaustive,
  )

it.prop(
  '∀spec_ApprovedGuests_=DecidedPorts',
  { of: [successCase], subject: renderSandboxPlan },
  (subject, [command]) =>
    Result.match(subject(command), {
      onFailure: () => false,
      onSuccess: (decision) =>
        Match.value(decision).pipe(
          Match.tag('PlanApproved', (approved) => guestsDecided(command, approved.guests)),
          Match.tag('PlanRefused', () => false),
          Match.exhaustive,
        ),
    }),
)

it.prop(
  '∀plan_Configuration_=Conserved',
  { of: [successCase], subject: renderSandboxPlan },
  (subject, [command]) =>
    planLaw(subject, command, (plan) => {
      const envKeys = Object.keys(command.spec.env)
      return holds([
        plan.name === command.name,
        plan.image === command.spec.image,
        plan.cpus === command.spec.vCPUs,
        plan.memoryMiB === command.spec.memoryMb,
        plan.mounts.length === command.spec.mounts.length,
        envKeys.length === Object.keys(plan.envs).length,
        envKeys.every((k) => plan.envs[k] === command.spec.env[k]),
      ])
    }),
)

const jobFields = (
  job: JobSpec,
  overrides: { readonly hostAccess: boolean | undefined; readonly workdir: string | undefined },
): JobSpec =>
  JobSpec.make({
    image: job.image,
    env: job.env,
    mounts: job.mounts,
    memoryMb: job.memoryMb,
    vCPUs: job.vCPUs,
    cmd: job.cmd,
    workdir: overrides.workdir,
    hostAccess: overrides.hostAccess,
  })

const jobCase = (hostAccess: boolean | undefined, workdir: Arbitrary.Arbitrary<string | undefined>) =>
  Arbitrary.map(
    Arbitrary.all([
      Arbitrary.schema(JobSpec),
      workdir,
      Arbitrary.schema(Schema.Int),
      Arbitrary.schema(Schema.String),
    ]),
    ([job, workdir, pid, suffix]): PlanSandbox =>
      new PlanSandbox({
        spec: jobFields(job, { hostAccess, workdir }),
        bindings: [],
        name: `sandbox-${pid}-${suffix}`,
      }),
  )

const absentWorkdir: Arbitrary.Arbitrary<string | undefined> = Arbitrary.schema(Schema.Undefined)
const anyWorkdir: Arbitrary.Arbitrary<string | undefined> = Arbitrary.schema(Schema.String)

const noOptInCase = jobCase(undefined, absentWorkdir)
const hostAccessTrueCase = jobCase(true, anyWorkdir)
const hostAccessFalseCase = jobCase(false, anyWorkdir)
const workdirCase = jobCase(undefined, anyWorkdir)

const serviceCase = Arbitrary.map(
  Arbitrary.all([
    Arbitrary.schema(ServiceSpec),
    loopbackBindings,
    Arbitrary.schema(Schema.Int),
    Arbitrary.schema(Schema.String),
  ]),
  ([service, bindings, pid, suffix]): PlanSandbox =>
    new PlanSandbox({ spec: service, bindings, name: `sandbox-${pid}-${suffix}` }),
)

it.prop(
  '∀noOptIn_Render_=NoProfiles',
  { of: [noOptInCase], subject: renderSandboxPlan },
  (subject, [command]) =>
    planLaw(subject, command, (plan) => holds([plan.networkProfiles === undefined, plan.workdir === undefined])),
)

it.prop(
  '∀hostAccessTrue_Render_=HostAndPublicProfiles',
  { of: [hostAccessTrueCase], subject: renderSandboxPlan },
  (subject, [command]) =>
    planLaw(subject, command, (plan) =>
      Option.match(Option.fromNullishOr(plan.networkProfiles), {
        onNone: () => false,
        onSome: (profiles) => holds([profiles.includes('public'), profiles.includes('host')]),
      })),
)

it.prop(
  '∀hostAccessFalse_Render_=NoProfiles',
  { of: [hostAccessFalseCase], subject: renderSandboxPlan },
  (subject, [command]) => planLaw(subject, command, (plan) => plan.networkProfiles === undefined),
)

it.prop(
  '∀workdir_Render_=Workdir',
  { of: [workdirCase], subject: renderSandboxPlan },
  (subject, [command]) =>
    planLaw(subject, command, (plan) =>
      Match.value(command.spec).pipe(
        Match.tag('Job', (job) => plan.workdir === job.workdir),
        Match.tag('Service', () => false),
        Match.exhaustive,
      )),
)

it.prop(
  '∀serviceSpec_Render_=ServiceShape',
  { of: [serviceCase], subject: renderSandboxPlan },
  (subject, [command]) =>
    planLaw(subject, command, (plan) =>
      Match.value(command.spec).pipe(
        Match.tag(
          'Service',
          (service) => holds([cmdEchoes(plan, service.cmd), plan.workdir === undefined, !('networkProfiles' in plan)]),
        ),
        Match.tag('Job', () => false),
        Match.exhaustive,
      )),
)

it.prop(
  '∀spec_Render_≡Files',
  { of: [successCase], subject: renderSandboxPlan },
  (subject, [command]) =>
    planLaw(
      subject,
      command,
      (plan) => Schema.toEquivalence(SandboxPlan.fields.files)(plan.files, { ...command.spec.files }),
    ),
)

const pathSegment = Arbitrary.schema(Schema.String.pipe(Schema.check(Schema.isPattern(/^[a-z]{1,6}$/))))
const directorySegments = Arbitrary.array(pathSegment, { minLength: 1, maxLength: 3 })

const chainOf = (segments: ReadonlyArray<string>): ReadonlyArray<string> =>
  Arr.drop(Arr.scan(segments, '', (parent, segment) => `${parent}/${segment}`), 1)

const serviceWithFiles = (files: Record<string, string>): PlanSandbox =>
  new PlanSandbox({
    spec: ServiceSpec.make({ image: 'alpine:3.20', env: {}, mounts: [], ports: [], files }),
    bindings: [],
    name: 'sandbox-files',
  })

it.prop(
  '∀directories_Render_≡ParentChain',
  { of: [directorySegments, pathSegment], subject: renderSandboxPlan },
  (subject, [segments, name]) =>
    planLaw(
      subject,
      serviceWithFiles({ [`/${segments.join('/')}/${name}`]: '' }),
      (plan) => plan.directories.join('\n') === chainOf(segments).join('\n'),
    ),
)

it.prop(
  '∀directories_Render_=SharedDirectoryOnce',
  { of: [directorySegments, pathSegment, pathSegment], subject: renderSandboxPlan },
  (subject, [segments, first, second]) =>
    planLaw(
      subject,
      serviceWithFiles({ [`/${segments.join('/')}/${first}`]: '', [`/${segments.join('/')}/${second}`]: 'x' }),
      (plan) => plan.directories.join('\n') === chainOf(segments).join('\n'),
    ),
)
