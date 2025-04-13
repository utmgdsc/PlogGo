declare module 'haversine' {
  interface Options {
    unit?: 'km' | 'mile' | 'meter' | 'nmi';
  }

  interface Point {
    latitude: number;
    longitude: number;
  }

  function haversine(start: Point, end: Point, options?: Options): number;
  export = haversine;
} 