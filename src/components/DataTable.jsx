import { useState } from 'react';
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

/**
 * Reusable DataTable component with pagination.
 *
 * Column definition format (similar to MUI DataGrid for easy migration):
 * {
 *   field: string,           // Key in row object (used if no renderCell)
 *   headerName: string,      // Column header text
 *   align?: 'left' | 'center' | 'right',
 *   width?: number | string,
 *   renderCell?: (row) => ReactNode,  // Custom cell renderer
 * }
 *
 * @param {Object} props
 * @param {Array} props.columns - Column definitions
 * @param {Array} props.rows - Data rows
 * @param {Function|string} props.getRowId - Function or field name to get unique row ID
 * @param {number} props.defaultRowsPerPage - Initial rows per page (default: 10)
 * @param {Array} props.rowsPerPageOptions - Options for rows per page selector
 * @param {string} props.emptyMessage - Message when no rows (default: 'No data found')
 */
function DataTable({
  columns,
  rows,
  getRowId = 'id',
  defaultRowsPerPage = 10,
  rowsPerPageOptions = [5, 10, 25, 50],
  emptyMessage = 'No data found',
}) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = event => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getRowKey = (row, index) => {
    if (typeof getRowId === 'function') {
      return getRowId(row);
    }
    return row[getRowId] ?? index;
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
                    {column.renderCell ? column.renderCell(row) : row[column.field]}
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
