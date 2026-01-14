import { t } from 'i18next';

const FullLogo = () => {
  return (
    <div className="h-[60px]">
      <img
        className="h-full"
        src="/ada-logo.png"
        alt="ADA Logo"
      />
    </div>
  );
};
FullLogo.displayName = 'FullLogo';
export { FullLogo };
