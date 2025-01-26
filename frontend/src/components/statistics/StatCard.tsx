
import { Card, Icon } from '@mui/material';
import { IconType } from 'react-icons';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  color: 'total' | 'danger' | 'warning' | 'info';
}

const StatCard = ({ title, value, icon, color }: StatCardProps) => {
  return (
    <Card className={`stat-card ${color}`}>
      <i className={`fas ${icon}`}></i>
      <h3>{value}</h3>
      <p>{title}</p>
    </Card>
  );
};

export default StatCard;
