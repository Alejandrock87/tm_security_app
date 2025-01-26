
import { ButtonGroup, Button } from '@mui/material';

interface QuickFiltersProps {
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
}

const QuickFilters = ({ selectedPeriod, onPeriodChange }: QuickFiltersProps) => {
  return (
    <ButtonGroup variant="outlined" className="quick-filters">
      <Button 
        className={selectedPeriod === 'all' ? 'active' : ''} 
        onClick={() => onPeriodChange('all')}
      >
        Todos
      </Button>
      <Button 
        className={selectedPeriod === 'today' ? 'active' : ''} 
        onClick={() => onPeriodChange('today')}
      >
        Hoy
      </Button>
      <Button 
        className={selectedPeriod === 'week' ? 'active' : ''} 
        onClick={() => onPeriodChange('week')}
      >
        Esta Semana
      </Button>
      <Button 
        className={selectedPeriod === 'month' ? 'active' : ''} 
        onClick={() => onPeriodChange('month')}
      >
        Este Mes
      </Button>
    </ButtonGroup>
  );
};

export default QuickFilters;
