const PageHeader = ({ title, subtitle, actions }) => {
  return (
    <header className="sa-page-header">
      <div className="sa-page-header__inner">
        <div className="sa-page-header__text">
          <h1 className="sa-page-header__title">{title}</h1>
          {subtitle ? (
            <p className="sa-page-header__subtitle">{subtitle}</p>
          ) : null}
        </div>

        {actions ? (
          <div className="sa-page-header__actions">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
};

export default PageHeader;
