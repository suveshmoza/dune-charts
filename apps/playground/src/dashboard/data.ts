export type HarvestRow = {
  id: number;
  header: string;
  type: string;
  status: 'Done' | 'In Process' | 'Queued';
  target: string;
  limit: string;
  reviewer: string;
};

export const harvestTable: HarvestRow[] = [
  {
    id: 1,
    header: 'North ridge haul',
    type: 'Extraction',
    status: 'Done',
    target: '18',
    limit: '20',
    reviewer: 'Stilgar',
  },
  {
    id: 2,
    header: 'South basin survey',
    type: 'Survey',
    status: 'In Process',
    target: '12',
    limit: '15',
    reviewer: 'Chani',
  },
  {
    id: 3,
    header: 'Deep desert probe',
    type: 'Extraction',
    status: 'Queued',
    target: '9',
    limit: '12',
    reviewer: 'Assign reviewer',
  },
  {
    id: 4,
    header: 'Cistern B refill',
    type: 'Logistics',
    status: 'Done',
    target: '30',
    limit: '28',
    reviewer: 'Kynes',
  },
  {
    id: 5,
    header: 'Wind wall check',
    type: 'Ops',
    status: 'In Process',
    target: '7',
    limit: '10',
    reviewer: 'Stilgar',
  },
  {
    id: 6,
    header: 'Thrift depot transfer',
    type: 'Logistics',
    status: 'Done',
    target: '22',
    limit: '22',
    reviewer: 'Chani',
  },
  {
    id: 7,
    header: 'Silica sorting line',
    type: 'Processing',
    status: 'Queued',
    target: '14',
    limit: '16',
    reviewer: 'Assign reviewer',
  },
  {
    id: 8,
    header: 'Harvester fleet 7',
    type: 'Ops',
    status: 'Done',
    target: '11',
    limit: '11',
    reviewer: 'Kynes',
  },
  {
    id: 9,
    header: 'Spice cache audit',
    type: 'Survey',
    status: 'In Process',
    target: '16',
    limit: '18',
    reviewer: 'Stilgar',
  },
  {
    id: 10,
    header: 'Water debt ledger',
    type: 'Logistics',
    status: 'Done',
    target: '25',
    limit: '24',
    reviewer: 'Chani',
  },
  {
    id: 11,
    header: 'Sector 4 wind shear',
    type: 'Ops',
    status: 'Queued',
    target: '5',
    limit: '8',
    reviewer: 'Assign reviewer',
  },
  {
    id: 12,
    header: 'Melange assay Q4',
    type: 'Processing',
    status: 'Done',
    target: '20',
    limit: '19',
    reviewer: 'Kynes',
  },
];

export const throughput = [
  { month: 'Jan', melange: 42, water: 28, thrift: 18, wind: 22, silica: 14 },
  { month: 'Feb', melange: 48, water: 26, thrift: 21, wind: 25, silica: 16 },
  { month: 'Mar', melange: 55, water: 31, thrift: 24, wind: 19, silica: 18 },
  { month: 'Apr', melange: 61, water: 29, thrift: 27, wind: 28, silica: 20 },
  { month: 'May', melange: 58, water: 34, thrift: 30, wind: 24, silica: 22 },
  { month: 'Jun', melange: 67, water: 33, thrift: 29, wind: 31, silica: 19 },
  { month: 'Jul', melange: 72, water: 38, thrift: 33, wind: 27, silica: 25 },
  { month: 'Aug', melange: 69, water: 36, thrift: 35, wind: 34, silica: 23 },
  { month: 'Sep', melange: 76, water: 41, thrift: 38, wind: 30, silica: 27 },
  { month: 'Oct', melange: 81, water: 39, thrift: 42, wind: 36, silica: 29 },
  { month: 'Nov', melange: 74, water: 44, thrift: 40, wind: 33, silica: 26 },
  { month: 'Dec', melange: 88, water: 47, thrift: 45, wind: 38, silica: 31 },
] as const;

export type ThroughputRow = (typeof throughput)[number];

export const THROUGHPUT_KEYS = ['melange', 'water', 'thrift', 'wind', 'silica'] as const;

export const throughputConfig = {
  melange: { label: 'Melange' },
  water: { label: 'Water' },
  thrift: { label: 'Thrift' },
  wind: { label: 'Wind' },
  silica: { label: 'Silica' },
} as const;
