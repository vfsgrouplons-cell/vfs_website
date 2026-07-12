export const formatDate=(value)=>value?new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value)):'Never';
export function humanize(value=''){return value.replaceAll('_',' ').replace(/\b\w/g,(letter)=>letter.toUpperCase())}
