/** Mini pixel-wave brand mark — same block language as the chart. */
export function PixelMark({ className = 'db-brand__mark' }: { className?: string }) {
  const rows = [
    [0, 0, 1, 1, 0, 0, 0, 0],
    [0, 1, 1, 1, 1, 0, 0, 0],
    [1, 1, 2, 2, 1, 1, 0, 0],
    [1, 2, 2, 3, 2, 1, 1, 0],
    [2, 2, 3, 3, 2, 2, 1, 1],
    [2, 3, 3, 4, 3, 2, 2, 1],
    [3, 3, 4, 4, 3, 3, 2, 2],
    [3, 4, 4, 5, 4, 3, 3, 2],
  ] as const;

  const pixels: { id: string; cell: number; column: number; row: number }[] = [];
  for (let row = 0; row < rows.length; row += 1) {
    const cells = rows[row];
    if (cells == null) continue;
    for (let column = 0; column < cells.length; column += 1) {
      const cell = cells[column];
      if (cell == null || cell === 0) continue;
      pixels.push({ id: `px-r${row}-c${column}-v${cell}`, cell, column, row });
    }
  }

  return (
    <span className={className} aria-hidden>
      {pixels.map((pixel) => (
        <span
          key={pixel.id}
          className={`db-px db-px--${pixel.cell}`}
          style={{ gridColumn: pixel.column + 1, gridRow: pixel.row + 1 }}
        />
      ))}
    </span>
  );
}
