import {
  Box,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TablePaginationProps,
  TableRow,
  TableSortLabel,
  Typography,
  styled,
} from "@mui/material";
import { ElementType, useEffect, useMemo, useState } from "react";
import { useAuthContext } from "../Contexts/AuthContext";
import PaginationActions from "./PaginationActions";

const StyledTableContainer = styled(TableContainer)({
  borderRadius: "8px",
  border: 0,
  marginBottom: "25px",
  position: "relative",
  "& .MuiTableRow-root:nth-of-type(2n)": {
    background: "#E3EEF9",
  },
  " .MuiTableCell-root:first-of-type": {
    paddingLeft: "40.44px",
  },
  "& .MuiTableCell-root:last-of-type": {
    paddingRight: "40.44px",
  },
});

const StyledTableHead = styled(TableHead)({
  background: "#5C8FA7",
});

const StyledHeaderCell = styled(TableCell)({
  fontWeight: 700,
  fontSize: "16px",
  lineHeight: "16px",
  color: "#fff !important",
  "&.MuiTableCell-root": {
    padding: "16px",
    color: "#fff !important",
    verticalAlign: "top",
  },
  "& .MuiSvgIcon-root,  & .MuiButtonBase-root": {
    color: "#fff !important",
  },
});

const StyledTableCell = styled(TableCell)({
  fontSize: "16px",
  color: "#083A50 !important",
  borderBottom: "0.5px solid #6B7294",
  fontFamily: "'Nunito'",
  fontStyle: "normal",
  fontWeight: 400,
  lineHeight: "19.6px",
  "&.MuiTableCell-root": {
    padding: "13px 16px",
  },
});

const StyledTablePagination = styled(TablePagination)<
  TablePaginationProps & { component: ElementType }
>({
  "& .MuiTablePagination-displayedRows, & .MuiTablePagination-selectLabel, & .MuiTablePagination-select":
    {
      height: "27px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#1D355F",
      textAlign: "center",
      fontVariantNumeric: "lining-nums tabular-nums",
      fontFamily: "Lato, sans-serif",
      fontSize: "14px",
      fontStyle: "normal",
      fontWeight: 400,
      lineHeight: "14.913px",
      letterSpacing: "0.14px",
    },
  "& .MuiToolbar-root .MuiInputBase-root": {
    height: "27px",
    marginLeft: 0,
    marginRight: "16px",
  },
  "& .MuiToolbar-root p": {
    marginTop: 0,
    marginBottom: 0,
  },
  "& .MuiToolbar-root": {
    minHeight: "45px",
    height: "fit-content",
    paddingTop: "7px",
    paddingBottom: "6px",
    borderTop: "2px solid #083A50",
    background: "#F5F7F8",
  },
});

export type Order = "asc" | "desc";

export type Column<T> = {
  label: string | React.ReactNode;
  value: (a: T, user: User) => string | boolean | number | React.ReactNode;
  field?: keyof T;
  default?: true;
};

export type FetchListing<T> = {
  first: number;
  offset: number;
  sortDirection: Order;
  orderBy: keyof T;
};

type Props<T> = {
  columns: Column<T>[];
  data: T[];
  total: number;
  loading?: boolean;
  noContentText?: string;
  onFetchData?: (params: FetchListing<T>) => void;
  onOrderChange?: (order: Order) => void;
  onOrderByChange?: (orderBy: Column<T>) => void;
  onPerPageChange?: (perPage: number) => void;
};

const DataSubmissionBatchTable = <T,>({
  columns,
  data,
  total = 0,
  loading,
  noContentText,
  onFetchData,
  onOrderChange,
  onOrderByChange,
  onPerPageChange,
}: Props<T>) => {
  const { user } = useAuthContext();
  const [order, setOrder] = useState<Order>("desc");
  const [orderBy, setOrderBy] = useState<Column<T>>(
    columns.find((c) => c.default) || columns.find((c) => c.field)
  );
  const [page, setPage] = useState<number>(0);
  const [perPage, setPerPage] = useState<number>(10);

  useEffect(() => {
    if (!onFetchData) {
      return;
    }
    onFetchData({
      first: perPage,
      offset: page * perPage,
      sortDirection: order,
      orderBy: orderBy?.field,
    });
  }, [page, perPage, order, orderBy]);

  const emptyRows = useMemo(() => (page > 0 && total
      ? Math.max(0, (1 + page) * perPage - (total || 0))
      : 0), [data]);

  const handleRequestSort = (column: Column<T>) => {
    const newOrder = orderBy === column && order === "asc" ? "desc" : "asc";
    if (typeof onOrderChange === "function") {
      onOrderChange(newOrder);
    }
    if (typeof onOrderByChange === "function") {
      onOrderByChange(column);
    }

    setOrder(newOrder);
    setOrderBy(column);
  };

  const handleChangeRowsPerPage = (event) => {
    const newPerPage = parseInt(event.target.value, 10);
    if (typeof onPerPageChange === "function") {
      onPerPageChange(newPerPage);
    }

    setPerPage(newPerPage);
    setPage(0);
  };

  return (
    <StyledTableContainer>
      <Table>
        <StyledTableHead>
          <TableRow>
            {columns.map((col: Column<T>) => (
              <StyledHeaderCell key={col.label.toString()}>
                {col.field ? (
                  <TableSortLabel
                    active={orderBy === col}
                    direction={orderBy === col ? order : "asc"}
                    onClick={() => handleRequestSort(col)}
                  >
                    {col.label}
                  </TableSortLabel>
                ) : (
                  col.label
                )}
              </StyledHeaderCell>
            ))}
          </TableRow>
        </StyledTableHead>
        <TableBody>
          {loading && (
            <TableRow>
              <TableCell>
                <Box
                  sx={{
                    position: "absolute",
                    background: "#fff",
                    left: 0,
                    top: 0,
                    width: "100%",
                    height: "100%",
                    zIndex: "9999",
                  }}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <CircularProgress size={64} disableShrink thickness={3} />
                </Box>
              </TableCell>
            </TableRow>
          )}
          {data?.map((d: T) => (
            <TableRow tabIndex={-1} hover key={d["_id"]}>
              {columns.map((col: Column<T>) => (
                <StyledTableCell key={`${d["_id"]}_${col.label}`}>
                  {col.value(d, user)}
                </StyledTableCell>
              ))}
            </TableRow>
          ))}

          {/* Fill the difference between perPage and count to prevent height changes */}
          {emptyRows > 0 && (
            <TableRow style={{ height: 53 * emptyRows }}>
              <TableCell colSpan={columns.length} />
            </TableRow>
          )}

          {/* No content message */}
          {(!total || total === 0) && (
            <TableRow style={{ height: 53 * 10 }}>
              <TableCell colSpan={columns.length}>
                <Typography
                  variant="h6"
                  align="center"
                  fontSize={18}
                  color="#AAA"
                >
                  {noContentText || "No existing data was found"}
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <StyledTablePagination
        rowsPerPageOptions={[5, 10, 20, 50]}
        component="div"
        count={total || 0}
        rowsPerPage={perPage}
        page={page}
        onPageChange={(e, newPage) => setPage(newPage - 1)}
        onRowsPerPageChange={handleChangeRowsPerPage}
        nextIconButtonProps={{
            disabled: perPage === -1
              || !data
              || total === 0
              || total <= (page + 1) * perPage
              || emptyRows > 0
              || loading
          }}
        backIconButtonProps={{ disabled: page === 0 || loading }}
        ActionsComponent={PaginationActions}
      />
    </StyledTableContainer>
  );
};

export default DataSubmissionBatchTable;
