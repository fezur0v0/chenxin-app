import { localDate } from './store.js';
// Previous, current and next week, using local calendar dates across DST/month boundaries.
export function calendarWindow(now=new Date()){
 const today=localDate(now),start=new Date(now.getFullYear(),now.getMonth(),now.getDate()-now.getDay()-7);
 return Array.from({length:21},(_,i)=>{
  const date=new Date(start.getFullYear(),start.getMonth(),start.getDate()+i);
  return {date:localDate(date),day:date.getDate(),today:localDate(date)===today,currentMonth:date.getMonth()===now.getMonth()};
 });
}
