import HeroSection from "../sections/HeroSection.tsx";
import CategoryFilter from "../sections/CategoryFilter.tsx";
import RecommendationsSection from "../sections/Recommendations.tsx";

const HomePage: React.FC = () => {
  return (
    <div>
      <HeroSection />
      <CategoryFilter />
      <RecommendationsSection />
    </div>
  );
};

export default HomePage;
