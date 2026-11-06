import type { NetworkModel } from '../session/model';
import type { continuousNetwork } from './continuous-network';

type LayoutRequest = {
  requestId: string;
  model: NetworkModel;
  roomModulePreview: boolean;
};

type LayoutResponse = {
  requestId: string;
  geometry?: ReturnType<typeof continuousNetwork>;
  error?: string;
};

const workerScope = self as unknown as {
  onmessage: ((event: MessageEvent<LayoutRequest>) => void) | null;
  postMessage: (message: LayoutResponse) => void;
};

workerScope.onmessage = async event => {
  const { requestId, model, roomModulePreview } = event.data;
  try {
    // Load the large layout graph inside the request boundary. A module-load
    // failure in a static worker import otherwise terminates the worker before
    // it can send a useful error back to the UI.
    const [{ continuousNetwork }, { withRoomModuleLayout }] = await Promise.all([
      import('./continuous-network'),
      import('./room-module-layout-preview'),
    ]);
    const base = continuousNetwork(model);
    const geometry = roomModulePreview ? withRoomModuleLayout(model, base) : base;
    workerScope.postMessage({ requestId, geometry });
  } catch (error) {
    workerScope.postMessage({
      requestId,
      error: error instanceof Error ? `${error.message}${error.stack ? `\n${error.stack}` : ''}` : String(error),
    });
  }
};
