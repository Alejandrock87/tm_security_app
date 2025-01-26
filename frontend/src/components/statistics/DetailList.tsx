
import { Card, CardHeader, List, ListItem, Typography } from '@mui/material';

interface DetailListProps {
  title: string;
  items: { name: string; count: number }[];
}

const DetailList = ({ title, items }: DetailListProps) => {
  return (
    <Card>
      <CardHeader title={title} />
      <List className="scrollable-list">
        {items.map((item, index) => (
          <ListItem key={index} className="list-item">
            <Typography className="item-name">{item.name}</Typography>
            <Typography className="item-count">{item.count}</Typography>
          </ListItem>
        ))}
      </List>
    </Card>
  );
};

export default DetailList;
