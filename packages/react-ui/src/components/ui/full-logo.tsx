import { t } from 'i18next';
import adaLogo from '@/assets/img/custom/ada-logo.png';

const FullLogo = () => {
  return (
    <div className="h-[60px]">
      <img
        className="h-full"
        src={adaLogo}
        alt="ADA Logo"
      />
    </div>
  );
};
FullLogo.displayName = 'FullLogo';
export { FullLogo };
