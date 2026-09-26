import { format, isValid, parse, parseISO } from "date-fns";

/** Value format of <input type="datetime-local">. */
export const LOCAL_FMT = "yyyy-MM-dd'T'HH:mm";

export const parseLocal = (v: string) => parse(v, LOCAL_FMT, new Date());
export const isLocal = (v: string) => isValid(parseLocal(v));
export const isoToLocal = (iso: string) => format(parseISO(iso), LOCAL_FMT);
export const toLocal = (d: Date) => format(d, LOCAL_FMT);
