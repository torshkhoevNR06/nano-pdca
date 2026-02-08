interface Cycle {
  id: string;
  title: string;
  hypothesis: string;
  category: string;
  startDate: string; 
  endDate: string;   
  duration: number;
  status: 'active' | 'completed';
  phase: 'Do' | 'Check' | 'Act';
  results: CycleResult | null;
  finalDecision: 'Adopted' | 'Adjusted' | 'Abandoned' | null;
}