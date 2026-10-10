import express from "express";
import { getWeatherData } from "../services/weatherService.js";

const router = express.Router();

router.get("/", async (req, res) => {

    try {

        const weather = await getWeatherData();

        res.json({
            success: true,
            data: weather
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch weather data"
        });
    }
});

export default router;