declare module 'replicate' {
  type Status = 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';

  interface ReplicateOptions {
    auth: string;
  }

  interface Prediction {
    id: string;
    version: string;
    model: string;
    input: Record<string, any>;
    status: Status;
    output: string;
    error?: string;
    source?: string;
    created_at?: string;
    started_at?: string;
    completed_at?: string;
  }

  interface PredictionsAPI {
    create(options: {
      model: string;
      version: string;
      input: Record<string, any>;
    }): Promise<Prediction>;
    get(id: string): Promise<Prediction>;
  }

  export default class Replicate {
    predictions: PredictionsAPI;
    constructor(options: ReplicateOptions);
  }

  export type { Prediction, Status };
} 