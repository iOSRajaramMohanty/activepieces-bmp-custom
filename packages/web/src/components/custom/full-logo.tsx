const ADA_LOGO_URL = 'https://imagedelivery.net/ZvxstLLilyjMGnog41fs3g/ff4be95c-e460-492f-b112-128c64056100/public';

const FullLogo = () => {
  return (
    <div className="h-[60px]">
      <img
        className="h-full"
        src={ADA_LOGO_URL}
        alt="ADA Logo"
      />
    </div>
  );
};
FullLogo.displayName = 'FullLogo';
export { FullLogo };
