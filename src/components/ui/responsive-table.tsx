import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ResponsiveTableProps {
  children: React.ReactNode;
  mobileCardRender?: () => React.ReactNode;
  className?: string;
  minWidth?: string;
}

export const ResponsiveTable: React.FC<ResponsiveTableProps> = ({
  children,
  mobileCardRender,
  className,
  minWidth = '800px'
}) => {
  return (
    <>
      {/* Desktop/Tablet Table View */}
      <div className="hidden md:block">
        <div className="overflow-x-auto rounded-lg border">
          <div style={{ minWidth }} className="w-full">
            <Table className={cn("w-full", className)}>
              {children}
            </Table>
          </div>
        </div>
      </div>

      {/* Mobile Card View */}
      {mobileCardRender && (
        <div className="md:hidden">
          {mobileCardRender()}
        </div>
      )}
    </>
  );
};

interface MobileTableCardProps {
  children: React.ReactNode;
  className?: string;
}

export const MobileTableCard: React.FC<MobileTableCardProps> = ({ children, className }) => {
  return (
    <Card className={cn("mb-4", className)}>
      <CardContent className="p-4">
        {children}
      </CardContent>
    </Card>
  );
};

interface MobileTableRowProps {
  label: string;
  value: React.ReactNode;
  className?: string;
}

export const MobileTableRow: React.FC<MobileTableRowProps> = ({ label, value, className }) => {
  return (
    <div className={cn("flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0", className)}>
      <span className="text-sm font-medium text-gray-600">{label}:</span>
      <span className="text-sm text-gray-900 text-right flex-1 ml-4">{value}</span>
    </div>
  );
};

// Enhanced table with better mobile experience
interface ResponsiveDataTableProps<T> {
  data: T[];
  columns: Array<{
    key: keyof T | string;
    header: string;
    render?: (item: T) => React.ReactNode;
    mobileRender?: (item: T) => React.ReactNode;
    width?: string;
    className?: string;
  }>;
  mobileCardRender?: (item: T, index: number) => React.ReactNode;
  emptyMessage?: string;
  className?: string;
  onRowClick?: (item: T) => void;
  expandedRowId?: string | null;
  expandedRowRender?: (item: T) => React.ReactNode;
}

export function ResponsiveDataTable<T extends Record<string, any>>({
  data,
  columns,
  mobileCardRender,
  emptyMessage = "No data available",
  className,
  onRowClick,
  expandedRowId,
  expandedRowRender
}: ResponsiveDataTableProps<T>) {
  const defaultMobileCard = (item: T, index: number) => (
    <MobileTableCard key={index}>
      {columns.map((column) => (
        <MobileTableRow
          key={String(column.key)}
          label={column.header}
          value={column.mobileRender ? column.mobileRender(item) : (column.render ? column.render(item) : item[column.key as keyof T])}
        />
      ))}
    </MobileTableCard>
  );

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <ResponsiveTable
      className={className}
      mobileCardRender={() => (
        <div className="space-y-4">
          {data.map((item, index) =>
            mobileCardRender ? mobileCardRender(item, index) : defaultMobileCard(item, index)
          )}
        </div>
      )}
    >
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead
              key={String(column.key)}
              className={cn(column.className)}
              style={{ width: column.width }}
            >
              {column.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item, index) => (
          <React.Fragment key={index}>
            <TableRow
              className={cn(
                onRowClick && "cursor-pointer hover:bg-muted/50",
                expandedRowId === item.id && "bg-muted/30"
              )}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((column) => (
                <TableCell key={String(column.key)} className={cn(column.className)}>
                  {column.render ? column.render(item) : item[column.key as keyof T]}
                </TableCell>
              ))}
            </TableRow>
            {expandedRowId === item.id && expandedRowRender && (
              <TableRow>
                <TableCell colSpan={columns.length} className="p-0">
                  {expandedRowRender(item)}
                </TableCell>
              </TableRow>
            )}
          </React.Fragment>
        ))}
      </TableBody>
    </ResponsiveTable>
  );
}

export default ResponsiveTable;