
const parseHrtimeToMilliSeconds = (hrTime: [number, number]) => {
    const milliSeconds = ((hrTime[1] - hrTime[0]) / 1e6).toFixed(3);
    return +milliSeconds;
  };
  
  export default parseHrtimeToMilliSeconds;