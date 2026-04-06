import {
  cn,
  DASHBOARD_CONTENT_PADDING_X,
  DASHBOARD_FILTER_TOOLBAR_VERTICAL,
} from '@/lib/utils';

type DataTableToolbarProps = {
  children?: React.ReactNode;
};

const DataTableToolbar = (params: DataTableToolbarProps) => {
  return (
    <div
      className={cn(
        'flex items-center justify-between overflow-auto gap-4',
        DASHBOARD_FILTER_TOOLBAR_VERTICAL,
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
