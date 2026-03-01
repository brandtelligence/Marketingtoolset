import { useState, ReactNode, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { EmptyState, TableSkeleton } from './EmptyState';
import { useDashboardTheme } from './DashboardThemeContext';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  width?: string;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  loading?: boolean;
  error?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchFields?: (keyof T)[];
  pageSize?: number;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  toolbar?: ReactNode;
  rowClassName?: (row: T) => string;
}

type SortDir = 'asc' | 'desc' | null;

export function DataTable<T extends Record<string, unknown>>({
  columns, data, keyField, loading, error,
  searchable = true, searchPlaceholder = 'Search…', searchFields,
  pageSize = 10, onRowClick, emptyTitle, emptyDescription, toolbar, rowClassName,
}: DataTableProps<T>) {
  const t = useDashboardTheme();
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [page, setPage] = useState(1);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : d === 'desc' ? null : 'asc');
      if (sortDir === 'desc') setSortKey(null);
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  };

  const filtered = useMemo(() => {
    if (!query) return data;
    const q = query.toLowerCase();
    const fields = searchFields ?? (columns.map(c => c.key) as (keyof T)[]);
    return data.filter(row =>
      fields.some(f => String(row[f] ?? '').toLowerCase().includes(q))
    );
  }, [data, query, searchFields, columns]);

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return filtered;
    return [...filtered].sort((a, b) => {
      const av = String(a[sortKey] ?? '');
      const bv = String(b[sortKey] ?? '');
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      {(searchable || toolbar) && (
        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
          {searchable && (
            <div className="relative w-full sm:w-64">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${t.textFaint}`} />
              <input
                value={query}
                onChange={e => { setQuery(e.target.value); setPage(1); }}
                placeholder={searchPlaceholder}
                className={`w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none transition-all ${t.inputCls}`}
              />
            </div>
          )}
          {toolbar && <div className="flex gap-2 flex-wrap">{toolbar}</div>}
        </div>
      )}

      {/* Table */}
      <div className={`overflow-x-auto rounded-xl border ${t.tableBorder}`}>
        <table className="w-full text-sm">
          <thead>
            <tr className={`border-b ${t.trBorder} ${t.theadBg}`}>
              {columns.map(col => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left ${t.theadText} font-medium whitespace-nowrap ${col.width ?? ''} ${col.className ?? ''} ${col.sortable ? `cursor-pointer select-none transition-colors` : ''}`}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && (
                      sortKey === col.key
                        ? sortDir === 'asc'
                          ? <ChevronUp className="w-3 h-3" />
                          : <ChevronDown className="w-3 h-3" />
                        : <ChevronsUpDown className="w-3 h-3 opacity-40" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableSkeleton rows={5} cols={columns.length} />
            ) : error ? (
              <tr><td colSpan={columns.length}><EmptyState type="error" /></td></tr>
            ) : paginated.length === 0 ? (
              <tr><td colSpan={columns.length}><EmptyState type="empty" title={emptyTitle} description={emptyDescription} /></td></tr>
            ) : (
              paginated.map(row => (
                <tr
                  key={String(row[keyField])}
                  onClick={() => onRowClick?.(row)}
                  className={`border-b ${t.trBorder} ${t.trHover} transition-colors ${onRowClick ? 'cursor-pointer' : ''} ${rowClassName?.(row) ?? ''}`}
                >
                  {columns.map(col => (
                    <td key={col.key} className={`px-4 py-3 ${t.textSm} ${col.className ?? ''}`}>
                      {col.render ? col.render(row) : String(row[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && sorted.length > pageSize && (
        <div className={`flex items-center justify-between text-xs ${t.textMd}`}>
          <span>
            {sorted.length === 0 ? '0 results' : `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, sorted.length)} of ${sorted.length}`}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className={`p-1.5 rounded-lg ${t.hover} disabled:opacity-30 disabled:cursor-not-allowed transition-colors`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
              .reduce<(number | '…')[]>((acc, p, i, arr) => {
                if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('…');
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === '…' ? (
                  <span key={`ellipsis-${i}`} className="px-2">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className={`w-7 h-7 rounded-lg text-xs transition-colors ${safePage === p ? (t.isDark ? 'bg-purple-500/40 text-white' : 'bg-purple-500 text-white') : t.hover}`}
                  >
                    {p}
                  </button>
                )
              )}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className={`p-1.5 rounded-lg ${t.hover} disabled:opacity-30 disabled:cursor-not-allowed transition-colors`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}