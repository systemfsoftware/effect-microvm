import { Workflow } from '@systemfsoftware/effect-cell-types'
import { Match, Option, Schema } from 'effect'
import * as Result from 'effect/Result'
import { MicroVMSpec } from './MicroVMSpec.schema.js'

const ServiceStartDecisionTypeId: unique symbol = Symbol.for(
  '@systemfsoftware/effect-microsandbox/ServiceStartDecision',
)
type ServiceStartDecisionTypeId = typeof ServiceStartDecisionTypeId

export class StartRequired
  extends Schema.TaggedClass<StartRequired, { readonly brand: unique symbol }>()('StartRequired', {
    argv: Schema.NonEmptyArray(Schema.String),
  })
{
  readonly [ServiceStartDecisionTypeId] = ServiceStartDecisionTypeId
}

export class StartSkipped
  extends Schema.TaggedClass<StartSkipped, { readonly brand: unique symbol }>()('StartSkipped', {})
{
  readonly [ServiceStartDecisionTypeId] = ServiceStartDecisionTypeId
}

export const ServiceStartDecision = Schema.Union([StartRequired, StartSkipped])
export type ServiceStartDecision = typeof ServiceStartDecision.Type

export class ResolveServiceStart
  extends Schema.TaggedClass<ResolveServiceStart, { readonly brand: unique symbol }>()('ResolveServiceStart', {
    spec: MicroVMSpec,
  })
{
  static readonly [Workflow.InstrumentationBrand] = {} as const
}

export const resolveServiceStart = Workflow.make({
  command: ResolveServiceStart,
  decision: ServiceStartDecision,
  error: Schema.Never,
  decide: (command): Result.Result<ServiceStartDecision, never> =>
    Result.succeed(
      Match.value(command.spec).pipe(
        Match.tag('Job', () => StartSkipped.make()),
        Match.tag('Service', (service) =>
          Option.match(Option.fromNullishOr(service.cmd), {
            onSome: (argv) => StartRequired.make({ argv }),
            onNone: () => StartSkipped.make(),
          })),
        Match.exhaustive,
      ),
    ),
})

if (import.meta.vitest !== void 0) {
  const { it } = await import('@systemfsoftware/vitest')
  const Arbitrary = await import('effect/Arbitrary')
  const { JobSpec, ServiceSpec } = await import('./MicroVMSpec.schema.js')

  type Resolve = typeof resolveServiceStart

  const argv = Schema.NonEmptyArray(Schema.String)
  const argvEq = Schema.toEquivalence(argv)

  const decisionLaw = (
    resolve: Resolve,
    spec: MicroVMSpec,
    law: { readonly required: (argv: readonly [string, ...Array<string>]) => boolean; readonly skipped: boolean },
  ): boolean =>
    Result.match(resolve(new ResolveServiceStart({ spec })), {
      onFailure: () => false,
      onSuccess: (decision) =>
        Match.value(decision).pipe(
          Match.tag('StartRequired', (required) => law.required(required.argv)),
          Match.tag('StartSkipped', () => law.skipped),
          Match.exhaustive,
        ),
    })

  it.prop(
    '∀service_Start_≡Command',
    { of: [Arbitrary.schema(ServiceSpec), Arbitrary.schema(argv)], subject: resolveServiceStart },
    (subject, [service, cmd]) =>
      decisionLaw(subject, ServiceSpec.make({ ...service, cmd }), {
        required: (decided) => argvEq(decided, cmd),
        skipped: false,
      }),
  )

  it.prop(
    '∀service_Start_=SkippedWithoutCommand',
    { of: [Arbitrary.schema(ServiceSpec)], subject: resolveServiceStart },
    (subject, [service]) =>
      decisionLaw(subject, ServiceSpec.make({ ...service, cmd: undefined }), {
        required: () => false,
        skipped: true,
      }),
  )

  it.prop(
    '∀job_Start_=Skipped',
    { of: [Arbitrary.schema(JobSpec)], subject: resolveServiceStart },
    (subject, [job]) => decisionLaw(subject, job, { required: () => false, skipped: true }),
  )
}
