import axios from "axios";

const LATITUDE = process.env.OPEN_METEO_LATITUDE;
const LONGITUDE = process.env.OPEN_METEO_LONGITUDE;

export const getWeatherData = async () => {

    const response = await axios.get(
        "https://api.open-meteo.com/v1/forecast",
        {
            params: {
                latitude: LATITUDE,
                longitude: LONGITUDE,

                current:
                    "temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m",

                timezone: "Asia/Kolkata"
            }
        }
    );

    const current = response.data.current;

    return {
        temperature: current.temperature_2m,
        humidity: current.relative_humidity_2m,
        apparentTemperature: current.apparent_temperature,
        windSpeed: current.wind_speed_10m,
        timestamp: current.time
    };
};