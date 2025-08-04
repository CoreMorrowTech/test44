
const { COM, UDP, getDllPath, getConfigPath } = require('./core');


const com = new COM("COM3", 115200, 8, 1, "none");

com.selectProtocol(2);

// let result = com.SingleChannelVoltage(1, 2, 10.0223, "O", 255);
// console.log(`SingleChannelVoltage 结果: ${JSON.stringify(result)}`);

let result1 = com.getAddress(1);
console.log(`GetAddress 结果: ${JSON.stringify(result1)}`);

com.close();
