import { indexWalks } from './connectivity';
import type { ActiveGraph } from './connectivity';
import { indexRoutes } from './routes';

// Internal source queries share direction and earth-sink semantics in definite,
// conservative, coverage and conflict evaluations. Earth continuity is separate.
export function indexSourceQueries(graph: ActiveGraph, stops: ReadonlySet<string>) {
  let routes: ReturnType<typeof indexRoutes> | undefined;
  return {
    ...indexWalks(graph, { stopAt: stops }),
    edgeIds(start: string, target: string) {
      routes ??= indexRoutes(graph, stops);
      return routes.edgeIds(start, target);
    },
  };
}
