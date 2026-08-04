import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconCircleCheckFilled,
  IconLoader,
} from '@tabler/icons-react';
import { useMemo, useState } from 'react';

import { harvestTable, type HarvestRow } from './data';

const PAGE_SIZE = 8;

export function DataTable({ data = harvestTable }: { data?: HarvestRow[] }) {
  const [page, setPage] = useState(0);
  const [tab, setTab] = useState<'outline' | 'past' | 'focus'>('outline');

  const pageCount = Math.max(1, Math.ceil(data.length / PAGE_SIZE));
  const rows = useMemo(() => {
    const start = page * PAGE_SIZE;
    return data.slice(start, start + PAGE_SIZE);
  }, [data, page]);

  return (
    <section className="db-table-block">
      <div className="db-table-toolbar">
        <div className="db-tabs" role="tablist" aria-label="Table views">
          {(
            [
              ['outline', 'Outline'],
              ['past', 'Past Performance'],
              ['focus', 'Focus Documents'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={`db-tabs__item${tab === id ? ' is-active' : ''}`}
              onClick={() => {
                setTab(id);
                setPage(0);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <button type="button" className="db-btn">
          Add Section
        </button>
      </div>

      {tab !== 'outline' ? (
        <div className="db-table-empty">
          <p>No rows for this view yet.</p>
        </div>
      ) : (
        <>
          <div className="db-table-wrap">
            <table className="db-table">
              <thead>
                <tr>
                  <th>Header</th>
                  <th>Section Type</th>
                  <th>Status</th>
                  <th className="is-num">Target</th>
                  <th className="is-num">Limit</th>
                  <th>Reviewer</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="is-strong">{row.header}</td>
                    <td>
                      <span className="db-chip">{row.type}</span>
                    </td>
                    <td>
                      <span
                        className={`db-status is-${row.status === 'Done' ? 'done' : 'process'}`}
                      >
                        {row.status === 'Done' ? (
                          <IconCircleCheckFilled size={14} aria-hidden />
                        ) : (
                          <IconLoader size={14} aria-hidden />
                        )}
                        {row.status}
                      </span>
                    </td>
                    <td className="is-num">{row.target}</td>
                    <td className="is-num">{row.limit}</td>
                    <td>{row.reviewer}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="db-table-foot">
            <p className="db-table-foot__meta">
              Showing {rows.length} of {data.length} row(s)
            </p>
            <div className="db-pager">
              <span>
                Page {page + 1} of {pageCount}
              </span>
              <button
                type="button"
                className="db-icon-btn"
                aria-label="First page"
                disabled={page === 0}
                onClick={() => setPage(0)}
              >
                <IconChevronsLeft size={16} />
              </button>
              <button
                type="button"
                className="db-icon-btn"
                aria-label="Previous page"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                <IconChevronLeft size={16} />
              </button>
              <button
                type="button"
                className="db-icon-btn"
                aria-label="Next page"
                disabled={page >= pageCount - 1}
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              >
                <IconChevronRight size={16} />
              </button>
              <button
                type="button"
                className="db-icon-btn"
                aria-label="Last page"
                disabled={page >= pageCount - 1}
                onClick={() => setPage(pageCount - 1)}
              >
                <IconChevronsRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
