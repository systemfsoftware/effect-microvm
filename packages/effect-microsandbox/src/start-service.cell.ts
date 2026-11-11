import { Sandwich } from '@systemfsoftware/effect-cell-types'
import { Effect } from 'effect'
import type { AcquiredVM } from './boot-sandbox.cell.js'
import { ExecError, SandboxBootError } from './MicroVMError.schema.js'
import { ResolveServiceStart, resolveServiceStart } from './resolve-service-start.workflow.js'

export type StartServiceRead = (typeof ResolveServiceStart)['Encoded'] & AcquiredVM

const readStart = (vm: AcquiredVM): Effect.Effect<StartServiceRead> =>
  Effect.succeed({ ...vm, _tag: 'ResolveServiceStart' })

const launch = (vm: AcquiredVM, argv: readonly [string, ...Array<string>]): Effect.Effect<void, ExecError> =>
  Effect.asVoid(
    Effect.tryPromise({
      try: () => vm.sandbox.execDetached(argv[0], argv.slice(1)),
      catch: (cause) => new ExecError({ argv, cause }),
    }),
  )

export const startService = Sandwich.named('start_service')(readStart)
  .decide(resolveServiceStart)
  .write({
    StartRequired: (required, snapshot) => Effect.as(launch(snapshot, required.argv), snapshot),
    StartSkipped: (_skipped, snapshot) => Effect.succeed(snapshot),
    CommandRejected: (rejected, snapshot) =>
      Effect.fail(new SandboxBootError({ sandboxName: snapshot.sandbox.name, cause: rejected })),
  })
