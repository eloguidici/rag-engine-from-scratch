/** Query that represents a read-only question against the indexed corpus. */
export class AskRagQuery {
  constructor(
    public readonly question: string,
    public readonly topK?: number,
    public readonly filters?: Record<string, string | number | boolean>,
  ) {}
}
