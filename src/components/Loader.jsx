import { CardGridSkeleton } from "./loading/LoadingPrimitives";

const Loader = ({ count = 6, className = "exam-vault-skeleton-grid" }) => {
  return (
    <CardGridSkeleton
      count={count}
      className={className}
      cardClassName="exam-vault-skeleton-card"
      ariaLabel="Loading content"
    />
  );
};

export default Loader;