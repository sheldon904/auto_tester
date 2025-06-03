# PageSpeed Insights Batch Tester

An automated tool for running multiple Google PageSpeed Insights tests to get consistent performance metrics by bypassing cache limitations.

## Features

- **Batch Testing**: Run multiple PageSpeed Insights tests in sequence
- **Fresh Results**: Waits 35 seconds between tests to bypass PSI's 30-second cache
- **Dual Device Testing**: Tests both desktop and mobile simultaneously
- **Comprehensive Metrics**: Tracks all 5 core metrics:
  - First Contentful Paint (FCP)
  - Total Blocking Time (TBT)
  - Speed Index
  - Largest Contentful Paint (LCP)
  - Cumulative Layout Shift (CLS)
- **Real-time Progress**: Live updates showing test progress and individual results
- **Average Calculations**: Automatically calculates and displays average scores
- **Export Results**: Copy formatted results to clipboard

## How to Use

1. **Open the Application**: Open `index.html` in your web browser
2. **Enter URL**: Input the full website URL (including https://)
3. **Set Test Count**: Choose number of tests (1-20, recommended: 5-10)
4. **Start Testing**: Click "Start Testing" button
5. **Monitor Progress**: Watch real-time progress and individual test results
6. **View Averages**: See calculated averages for all metrics
7. **Copy Results**: Use "Copy Results to Clipboard" for easy sharing

## API Key (Optional)

The tool works without an API key but has rate limits. For unlimited testing:

1. Get a Google PageSpeed Insights API key from [Google Cloud Console](https://console.cloud.google.com/)
2. Replace `YOUR_API_KEY_HERE` in `script.js` with your actual API key

```javascript
const apiKey = 'your_actual_api_key_here';
```

## Technical Details

### Cache Busting Strategy
- Waits 35 seconds between tests (PSI caches for 30s)
- Uses cache-control headers to prevent browser caching
- Each test gets fresh lab data from Lighthouse

### Rate Limits
- **Without API Key**: 100 requests per 100 seconds per IP
- **With API Key**: 25,000 requests per day, 240 per minute

### Metrics Explanation
- **FCP**: Time when first content appears (good: <1.8s)
- **LCP**: Time when largest content loads (good: <2.5s)
- **CLS**: Visual stability score (good: <0.1)
- **TBT**: Total time main thread blocked (good: <200ms)
- **Speed Index**: How quickly content is visually populated (good: <3.4s)

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Responsive design included

## Files Structure

```
auto_test/
├── index.html          # Main application interface
├── styles.css          # Styling and responsive design
├── script.js           # Core functionality and API integration
└── README.md           # Documentation (this file)
```

## Troubleshooting

### Common Issues

1. **"API request failed" error**
   - Check internet connection
   - Verify URL format (must include http/https)
   - Try with API key if hitting rate limits

2. **Tests taking too long**
   - Each test takes ~5-10 seconds
   - Cache clearing adds 35 seconds between tests
   - Total time: (Test count × 40-45 seconds)

3. **Inconsistent results**
   - This is normal - PageSpeed scores naturally vary
   - Run more tests (8-10) for better averages
   - External factors affect real-world performance

### Rate Limit Errors
If you see rate limit errors, either:
- Wait a few minutes before testing
- Add an API key for higher limits
- Reduce the number of tests

## Customization

You can modify the tool by editing:
- `styles.css`: Change colors, layout, or add themes
- `script.js`: Adjust wait times, add new metrics, or modify output format
- `index.html`: Add new UI elements or change structure

## Performance Notes

- Each complete test (desktop + mobile) counts as 2 API calls
- Recommended test count: 5-8 for good statistical average
- Higher test counts provide more accurate averages but take longer

## License

This tool is provided as-is for educational and testing purposes. Respect Google's API terms of service and rate limits.