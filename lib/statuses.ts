export const STATUS_ORDER = ['SN','PU','SS','MR','D','2','NS','S','5','T','SI']

export const STATUS_LABELS: Record<string, string> = {
  SN: 'Scope Needed',
  PU: 'Scope / Pickup Check',
  SS: 'Scope Scheduled',
  MR: 'Scope Complete / In Review',
  D:  'Waiting HOA Approval',
  '2': 'Materials Ordered',
  NS: 'Need to Schedule',
  '5': 'In Progress',
  T:  'Installed & Unpaid',
  SI: 'Need Subcontractor Invoice',
}

export const TAB_LABELS: Record<string, string> = {
  SN: 'Scope Needed',
  PU: 'Pickup Check',
  SS: 'Scope Scheduled',
  MR: 'In Review',
  D:  'Waiting HOA',
  '2': 'Materials Ordered',
  NS: 'Need to Schedule',
  S:  'Scheduled',
  '5': 'In Progress',
  T:  'Installed & Unpaid',
}

export const STATUS_BADGE_COLOR: Record<string, string> = {
  SN: '#EEEDFE',  MR: '#EEEDFE',  PU: '#EEEDFE',  SS: '#EEEDFE',
  NS: '#FAEEDA',  D: '#FAEEDA',
  S:  '#E6F1FB',  '5': '#E6F1FB',
  T:  '#FCEBEB',
  '2': '#E1F5EE', SI: '#E1F5EE',
}

export const STATUS_BADGE_TEXT: Record<string, string> = {
  SN: '#534AB7', MR: '#534AB7', PU: '#534AB7', SS: '#534AB7',
  NS: '#854F0B', D: '#854F0B',
  S:  '#185FA5', '5': '#185FA5',
  T:  '#A32D2D',
  '2': '#0F6E56', SI: '#0F6E56',
}
