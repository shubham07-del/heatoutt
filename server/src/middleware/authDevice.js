export const authDevice = (req, res, next) => {
  const apiKey = req.headers['x-device-api-key'];
  
  if (!apiKey || apiKey !== process.env.DEVICE_API_KEY) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized device'
    });
  }
  
  next();
};
