/** Remembers the cursor that opens each page of a cursor-based list. */
export class CursorPages {
  private cursors: Array<string | undefined> = [undefined];

  cursorFor(page: number): string | undefined {
    return this.cursors[page - 1];
  }

  canOpen(page: number, currentPage: number, hasNext: boolean): boolean {
    if (page < 1) {
      return false;
    }
    if (page <= this.cursors.length) {
      return true;
    }
    return page === currentPage + 1 && hasNext;
  }

  /** Store the cursor that loads the page after `page`. */
  remember(page: number, nextCursor: string | null): void {
    if (nextCursor) {
      this.cursors[page] = nextCursor;
      this.cursors.length = page + 1;
      return;
    }
    this.cursors.length = page;
  }

  reset(): void {
    this.cursors = [undefined];
  }
}
