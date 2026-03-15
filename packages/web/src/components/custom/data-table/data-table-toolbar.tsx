import { cn, DASHBOARD_CONTENT_PADDING_X } from '@/lib/utils';

type DataTableToolbarProps = {
  children?: React.ReactNode;
};

const DataTableToolbar = (params: DataTableToolbarProps) => {
  return (
    <div
      className={cn(
        'flex items-center justify-between pb-4 overflow-auto gap-4',
        DASHBOARD_CONTENT_PADDING_X,
      )}
    >
      <div className="flex flex-1 items-center gap-3 flex-wrap">
        {params.children}
      </div>
    </div>
  );
};
DataTableToolbar.displayName = 'DataTableToolbar';

export { DataTableToolbar };
