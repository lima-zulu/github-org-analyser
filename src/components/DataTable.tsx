import { useState, ReactNode } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Typography,
} from '@mui/material';

interface Column<T> {
  field: string;
  headerName: string;
  align?: 'left' | 'center' | 'right';
  width?: number | string;
  renderCell?: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  getRowId?: string | ((row: T) => string | number);
  defaultRowsPerPage?: number;
  rowsPerPageOptions?: number[];
  emptyMessage?: string;
}

function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  getRowId = 'id',
  defaultRowsPerPage = 10,
  rowsPerPageOptions = [5, 10, 25, 50],
  emptyMessage = 'No data found',
}: DataTableProps<T>) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getRowKey = (row: T, index: number): string | number => {
    if (typeof getRowId === 'function') {
      return getRowId(row);
    }
    return (row[getRowId] as string | number) ?? index;
  };

  const paginatedRows = rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            {columns.map(column => (
              <TableCell
                key={column.field}
                align={column.align || 'left'}
                style={column.width ? { width: column.width } : undefined}
              >
                {column.headerName}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {paginatedRows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} align="center" sx={{ py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  {emptyMessage}
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            paginatedRows.map((row, index) => (
              <TableRow key={getRowKey(row, index)}>
                {columns.map(column => (
                  <TableCell key={column.field} align={column.align || 'left'}>
                    {column.renderCell ? column.renderCell(row) : (row[column.field] as ReactNode)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {rows.length > 0 && (
        <TablePagination
          rowsPerPageOptions={rowsPerPageOptions}
          component="div"
          count={rows.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      )}
    </TableContainer>
  );
}

export default DataTable;
