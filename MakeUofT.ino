// MindMaxxing Firmware Code (Pulse and accelerometer sensors)

#include <PulseSensorPlayground.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <Wire.h>

const int OUTPUT_TYPE = SERIAL_PLOTTER;
const int PULSE_INPUT = A0;
const int PULSE_BLINK = LED_BUILTIN;
const int PULSE_FADE = 5;
const int THRESHOLD = 550;

PulseSensorPlayground pulseSensor;
Adafruit_MPU6050 mpu;

void setup() {
  Serial.begin(115200);
  while (!Serial) { // Pause before initializing
    delay(10); 
  }
  Wire.begin();
  
  // Initialize Pulse Sensor
  pulseSensor.analogInput(PULSE_INPUT);
  pulseSensor.blinkOnPulse(PULSE_BLINK);
  pulseSensor.fadeOnPulse(PULSE_FADE);
  pulseSensor.setSerial(Serial);
  pulseSensor.setOutputType(OUTPUT_TYPE);
  pulseSensor.setThreshold(THRESHOLD);

  if (!pulseSensor.begin()) {
    while (true) {
      digitalWrite(PULSE_BLINK, LOW);
      delay(100);
      //Serial.println("Heart Sensor Not Found");
      digitalWrite(PULSE_BLINK, HIGH);
      delay(100);
    }
  }
  // Serial.println("Heart Sensor Found!"); / Debugging sensor

  // Initialize IMU
  if (!mpu.begin(0x68)) {  // Try 0x68 first (MPU6050 I2C address)
    //Serial.println("Trying 0x69...");
    if (!mpu.begin(0x69)) {  // Try 0x69 if the first fails
      //Serial.println("Failed to find MPU6050 chip");
      while (1);
    }
  }
  // Serial.println("MPU6050 Found!"); // Debugging sensor

  mpu.setAccelerometerRange(MPU6050_RANGE_8_G); // set to 8 G
  // Serial.print("Accelerometer range set to: ");
  switch (mpu.getAccelerometerRange()) {
  case MPU6050_RANGE_2_G:
    Serial.println("+-2G");
    break;
  case MPU6050_RANGE_4_G:
    Serial.println("+-4G");
    break;
  case MPU6050_RANGE_8_G:
    // Serial.println("+-8G");
    break;
  case MPU6050_RANGE_16_G:
    Serial.println("+-16G");
    break;
  }
  mpu.setGyroRange(MPU6050_RANGE_500_DEG); // set to 500 degrees
  // Serial.print("Gyro range set to: ");
  switch (mpu.getGyroRange()) {
  case MPU6050_RANGE_250_DEG:
    Serial.println("+- 250 deg/s");
    break;
  case MPU6050_RANGE_500_DEG:
    // Serial.println("+- 500 deg/s");
    break;
  case MPU6050_RANGE_1000_DEG:
    Serial.println("+- 1000 deg/s");
    break;
  case MPU6050_RANGE_2000_DEG:
    Serial.println("+- 2000 deg/s");
    break;
  }

  mpu.setFilterBandwidth(MPU6050_BAND_21_HZ); // set to 21 Hz
  // Serial.print("Filter bandwidth set to: ");
  switch (mpu.getFilterBandwidth()) {
  case MPU6050_BAND_260_HZ:
    Serial.println("260 Hz");
    break;
  case MPU6050_BAND_184_HZ:
    Serial.println("184 Hz");
    break;
  case MPU6050_BAND_94_HZ:
    Serial.println("94 Hz");
    break;
  case MPU6050_BAND_44_HZ:
    Serial.println("44 Hz");
    break;
  case MPU6050_BAND_21_HZ:
    //Serial.println("21 Hz");
    break;
  case MPU6050_BAND_10_HZ:
    Serial.println("10 Hz");
    break;
  case MPU6050_BAND_5_HZ:
    Serial.println("5 Hz");
    break;
  }

  Serial.println("");
  delay(100);
}

void loop() {
  pulseSensor.sawNewSample();

 // Get BPM when a beat is detected (the library may average BPM internally for better accuracy)
  int bpm = 0;
  if (pulseSensor.sawStartOfBeat()) {
    bpm = pulseSensor.getBeatsPerMinute();
  }

  // Get new sensor events with the readings
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);

  // Format data as JSON string
  String data = "{";
    data += "\"heartRate\":" + String(bpm) + ",";
    data += "\"acceleration\":{";
    data += "\"x\":" + String(a.acceleration.x, 2) + ",";
    data += "\"y\":" + String(a.acceleration.y, 2) + ",";
    data += "\"z\":" + String(a.acceleration.z, 2) + "},";
    data += "\"gyroscope\":{";
    data += "\"x\":" + String(g.gyro.x, 2) + ",";
    data += "\"y\":" + String(g.gyro.y, 2) + ",";
    data += "\"z\":" + String(g.gyro.z, 2) + "},";
    data += "\"temperature\":" + String(temp.temperature, 2);
    data += "}";

  // Print out the values
  Serial.println(data);

  delay(1000);
}
