import React, { useEffect, useState } from 'react';

import { SearchableSelect } from '@/components/custom/searchable-select';
import { organizationApi } from '@/features/platform-admin/api/organization-api';
import { DropdownOption } from '@activepieces/pieces-framework';

type AdaBmpEnvironmentSelectProps = {
  allOptions: DropdownOption<string>[];
  onChange: (value: string | null) => void;
  value: string | undefined;
  disabled?: boolean;
  placeholder?: string;
  showDeselect?: boolean;
};

export const AdaBmpEnvironmentSelect = React.memo(
  ({
    allOptions,
    onChange,
    value,
    disabled,
    placeholder,
    showDeselect,
  }: AdaBmpEnvironmentSelectProps) => {
    const [filteredOptions, setFilteredOptions] =
      useState<DropdownOption<string>[]>(allOptions);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      const fetchAllowedEnvironments = async () => {
        try {
          console.log('[ADA BMP Environment Select] Fetching allowed environments...');
          
          // Call the new backend endpoint to get allowed environments
          const response = await organizationApi.getAllowedEnvironmentsForCurrentUser();
          
          console.log('[ADA BMP Environment Select] Allowed environments:', response.environments);
          
          // Filter options based on allowed environments
          const filtered = allOptions.filter((option) =>
            response.environments.includes(option.value as string)
          );
          
          console.log('[ADA BMP Environment Select] Filtered options:', 
            filtered.map(o => o.value).join(', '));
          
          if (filtered.length > 0) {
            setFilteredOptions(filtered);
          } else {
            // If no matches, show all as fallback
            console.warn('[ADA BMP Environment Select] No matching environments, showing all');
            setFilteredOptions(allOptions);
          }
        } catch (error) {
          console.error('[ADA BMP Environment Select] Error fetching allowed environments:', error);
          // On error, show all options as fallback
          setFilteredOptions(allOptions);
        } finally {
          setIsLoading(false);
        }
      };

      fetchAllowedEnvironments();
    }, [allOptions]);

    return (
      <SearchableSelect
        options={filteredOptions}
        onChange={onChange}
        value={value}
        disabled={disabled || isLoading}
        placeholder={isLoading ? 'Loading environments...' : (placeholder || 'Select an option')}
        showDeselect={showDeselect}
      />
    );
  }
);

AdaBmpEnvironmentSelect.displayName = 'AdaBmpEnvironmentSelect';
