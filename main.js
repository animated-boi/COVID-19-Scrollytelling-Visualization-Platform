// V3: final - added final viz's
// V3: Changed colors and UI to convey appropriate story

let index = 0;
let isPlaying = true; // To track play/pause state
const parseDate = d3.timeParse("%Y-%m-%d");
const formatMonth = d3.timeFormat("%Y-%m");
var lastLevel = false;

const tooltip = d3.select(".tooltip");

document.addEventListener("DOMContentLoaded", function () {
    var globalData, mapData, dataByISOCode, globalDataWorld;
    //load csv data
    Promise.all([d3.csv('Data/owid-covid-data.csv'),
    d3.json('Data/countries-geojson.json')
    ]).then(function (values) {
        globalDataWorld = values[0].filter(d => d.location == 'World')
        // Parse the data
        const parseDate = d3.timeParse("%Y-%m-%d");
        const formatYear = d3.timeFormat("%Y");
        const formatWeek = d3.timeFormat("%U"); // Week of the year
        const formatDay = d3.timeFormat("%w"); // Day of the week

        globalDataWorld.forEach(d => {
            d.total_deaths = +d.new_deaths;
        });
        //storing data from csv into files
        globalData = values[0].filter(d => d.location != 'World' && d.continent != '' && d.location != 'Asia' && d.location != 'Upper-middle-income countries' && d.location != 'Europe' && d.location != 'European Union (27)' && d.location != 'High-income countries' && d.location != 'Low-income countries' && d.location != 'Lower-middle-income countries' && d.location != 'North America' && d.location != 'South America');
        mapData = values[1];

        dataByISOCode = d3.groups(globalData, function (d) {
            return d.iso_code.toLowerCase()
        })

    })
    const steps = document.querySelectorAll(".step");
    let currentStep = 0; // Start at the first step
    let isScrolling = false; // Prevent rapid scrolling

    // Function to change scenes
    function changeStep(index) {
        if (index < 0 || index >= steps.length || isScrolling) return;

        isScrolling = true; // Block further scrolling during transition

        // Hide all sections
        steps.forEach((step, i) => {
            step.classList.remove("active");
            if (i === index) {
                step.classList.add("active");
            }
        });

        currentStep = index; // Update the current step

        // Call handleStepEnter with the active step
        const activeStep = steps[currentStep];
        handleStepEnter({ element: activeStep });

        // Allow scrolling again after transition
        setTimeout(() => {
            isScrolling = false;
        }, 800); // Match the CSS transition duration
    }

    // Handle scroll events
    window.addEventListener("wheel", (event) => {
        if (event.deltaY > 0) {
            changeStep(currentStep + 1); // Scroll down
        } else if (event.deltaY < 0) {
            changeStep(currentStep - 1); // Scroll up
        }
    });

    // Handle keyboard navigation
    window.addEventListener("keydown", (event) => {
        if (event.key === "ArrowDown") {
            changeStep(currentStep + 1);
        } else if (event.key === "ArrowUp") {
            changeStep(currentStep - 1);
        }
    });

    // Initialize the first section
    changeStep(currentStep);

    function handleStepEnter(response) {
        const stepId = response.element.id;

        switch (stepId) {
            case "intro": 
                break;
            case "step1": 
                map(globalData, dataByISOCode, mapData);
                if (raceBarChartMonths !== undefined) {
                    stopRaceBarChart();
                }
                break;
            case "step2": 
                if (raceBarChartMonths !== undefined) {
                    stopRaceBarChart();
                    startRaceBarChart();
                } else {
                    raceBarChart(globalData);
                }
                break;
            case "step3": 
                if (raceBarChartMonths !== undefined) {
                    stopRaceBarChart();
                }
                calenderChart(globalData);
                break;
            case "step4": 
                if (raceBarChartMonths !== undefined) {
                    stopRaceBarChart();
                }
                bubbleChart(globalData);
                break;
            case "step5": 
                if (raceBarChartMonths !== undefined) {
                    stopRaceBarChart();
                }
                sunburstChart(globalData, lastLevel);
                break;
            case "conclusion": 
                break;
            default:
                console.log("Unknown step");
        }
    }

});

function map(globalData, data, mapData) {
    d3.select('#visual1 svg').remove();
    d3.select('#slider svg').remove();
    var dataByCountry = {}
    data.forEach(function (d) {
        dataByCountry[d[0]] = d[1]
    })
    // space around the map
    const margin = {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
    },
        width = 960 - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom;

    // SVG to contain all the maps drawings
    const svg = d3.select("#visual1")
        .append("svg")
        .attr("preserveAspectRatio", "xMinYMin meet")
        .attr("viewBox", "0 0 " + (width) + " " + (height))
        .attr('class', 'map');

    const g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")")

    //setting min and max date for slider
    const minDate = new Date('2020-02-01'),
        maxDate = new Date('2024-08-04'),
        interval = maxDate.getFullYear() - minDate.getFullYear() + 1,
        startYear = minDate.getFullYear();
    let dataMonths = [];
    for (let year = 0; year < interval; year++) {
        for (let month = 0; month < 12; month++) {
            dataMonths.push(new Date(startYear + year, month, 1));
        }
    }
    //implementing slider 
    formatTime = d3.timeFormat('%b %Y')
    var slider = d3
        .sliderBottom()
        .min(minDate)
        .max(maxDate)
        .marks(dataMonths)
        .width(400)
        .tickFormat(d3.timeFormat('%b %Y'))
        .tickValues(dataMonths.filter(d => d.getMonth === 0))
        .default(minDate)
        .displayValue(true)
        .on('onchange', (val) => {
            update(val)
        });

    d3.select('#slider')
        .append('svg')
        .attr('width', 500)
        .attr('height', 80)
        .append('g')
        .attr('transform', 'translate(20,20)')
        .call(slider);

    var newDate;
    dateFilter = d3.timeFormat("%Y-%m-%d")
    //function to change map according to date value from slider
    function update(val) { 
        newDate = dateFilter(val);
        //filter data according to date value selected form slider
        var newData = globalData.filter(function (d) {
            return d.date <= newDate;
        })
        dataByISOCode = d3.groups(newData, function (d) {
            return d.iso_code.toLowerCase()
        })
        dataByCountry = {}
        dataByISOCode.forEach(function (d) {
            dataByCountry[d[0]] = d[1]
        })
        drawSpikes();
    };

    // used to define the shape of the world map
    const projection = d3.geoMercator()
        .scale(120)
        .translate([width / 2, height / 1.4]);

    // for generating the svg path data for each country
    const path = d3.geoPath().projection(projection);
    // Draw base map
    g.append("g")
        .selectAll("path")
        .data(mapData.features)
        .enter().append("path")
        .attr("class", "countries")
        .attr("d", path)
        .style("fill", "lightgrey")
        .style('stroke-width', 1.5)
        .style("opacity", 0.8)
        .style("stroke", "white")
        .style('stroke-width', 0.3);

    function drawSpikes() {

        const metricByISOCode = {};
        const features = mapData.features.filter(d => dataByCountry[d.id.toLowerCase()]);
        features.map(d => d.id.toLowerCase()).forEach(iso => {
            metricByISOCode[iso] = +d3.max(dataByCountry[iso], function (d) {
                return d['total_cases'];
            });
        });
        const spikeLengthScale = d3.scaleLinear()
            .domain(d3.extent(Object.values(metricByISOCode)))
            .range([2, 60]);

        // Compute centroids and spike data
        var centroids = features.map(function (feature) {
            const [x, y] = path.centroid(feature);
            const spikeLength = spikeLengthScale(metricByISOCode[feature.id.toLowerCase()]);
            const color = "red";
            return { x: x, y: y, spikeLength: spikeLength, color: color, iso: feature.id.toLowerCase(), cases: metricByISOCode[feature.id.toLowerCase()], name: feature.properties.name };
        });
        centroids = centroids.filter(d => d.cases != 0)

        const spike = (length, width = 7) => `M${-width / 2},0L0,${-length}L${width / 2},0`;

        // Bind data to spike groups
        const spikeGroups = g.selectAll(".centroid")
            .data(centroids, d => `${d.x}-${d.y}`); 
        // Enter new spikes
        const spikeEnter = spikeGroups.enter()
            .append("g")
            .attr("class", "centroid")
            .attr("transform", d => `translate(${d.x},${d.y})`)
            .attr("stroke", d => d.color)
            .attr("fill", 'none')
            .attr("stroke-width", 2)
            .on("mouseover", function (event, d) {
                d3.select(".tooltip").transition()
                    .duration(200)
                    .style("opacity", 0.9);
                d3.select(".tooltip").html(`Country: ${d.name}<br>Cases: ${d3.format(",")(d.cases)}`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function () {
                d3.select(".tooltip").transition()
                    .duration(500)
                    .style("opacity", 0);
            });

        spikeEnter.append('path')
            .attr("d", d => spike(d.spikeLength)); // Set initial path

        // Update existing spikes and animate to new path
        spikeGroups.merge(spikeEnter)
            .select("path")
            .transition()
            .duration(1000) // Adjust duration as needed
            .attr("d", d => spike(d.spikeLength)); // Animate to new spike length

        // Remove old spikes
        spikeGroups.exit().remove();

        // Find the top 3 countries with the highest cases
        const topCountries = Object.entries(metricByISOCode)
            .sort(([, a], [, b]) => b - a) // Sort by cases descending
            .slice(0, 3) // Top 3 countries
            .map(([iso]) => iso);

        // Reset all countries to default fill color
        g.selectAll(".countries")
            .interrupt() // Stop ongoing transitions
            .style("fill", "lightgrey");

        // Apply pulsing effect to top countries
        g.selectAll(".countries")
            .filter(d => topCountries.includes(d.id.toLowerCase()))
            .style("fill", "orange")
            .transition()
            .duration(1000)
            .ease(d3.easeSin)
            .style("fill", "red")
            .transition()
            .duration(1000)
            .ease(d3.easeSin)
            .style("fill", "orange")
            .on("end", function repeat() {
                d3.select(this)
                    .transition()
                    .duration(1000)
                    .ease(d3.easeSin)
                    .style("fill", "red")
                    .transition()
                    .duration(1000)
                    .ease(d3.easeSin)
                    .style("fill", "orange")
                    .on("end", repeat); // Loop animation
            });

    }
    drawSpikes();
    update(new Date(('2020-02-01')))

}
const colorScale = [
    "#1f77b4", // Blue
    "#ff7f0e", // Orange
    "#2ca02c", // Green
    "#d62728", // Red
    "#9467bd", // Purple
    "#8c564b", // Brown
    "#e377c2", // Pink
    "#7f7f7f", // Gray
    "#bcbd22", // Olive
    "#17becf", // Teal
    "#393b79", // Dark Blue
    "#637939", // Dark Green
    "#8c6d31", // Dark Brown
    "#843c39", // Dark Red
    "#7b4173", // Dark Purple
    "#3182bd", // Light Blue
    "#31a354", // Light Green
    "#e6550d", // Light Orange
    "#756bb1", // Light Purple
    "#636363"  // Dark Gray
];


// Global variables for race bar chart
let raceBarChartInterval; // Animation interval
let raceBarChartIsPlaying = true; // To track play/pause state
let raceBarChartIndex = 0; // Global index for animation
let raceBarChartMonths; // Global months array
let raceBarChartX, raceBarChartY; // Scales
let raceBarChartSvg; // SVG container
let raceBarChartData; // Processed data
let raceBarChartMargin, raceBarChartWidth, raceBarChartHeight; // Dimensions
const raceBarChartColor = d3.scaleOrdinal(d3.schemeCategory10);

// Function to set up the race bar chart
function raceBarChart(globalData) {
    d3.select('#visual2 svg').remove(); // Remove existing chart
    raceBarChartIndex = 0;

    // Chart margins and dimensions
    raceBarChartMargin = { top: 50, right: 80, bottom: 50, left: 150 };
    raceBarChartWidth = 960 - raceBarChartMargin.left - raceBarChartMargin.right;
    raceBarChartHeight = 500 - raceBarChartMargin.top - raceBarChartMargin.bottom;

    // SVG container
    raceBarChartSvg = d3.select("#visual2")
        .append("svg")
        .attr("preserveAspectRatio", "xMinYMin meet")
        .attr("viewBox", `0 0 ${raceBarChartWidth + raceBarChartMargin.left + raceBarChartMargin.right} ${raceBarChartHeight + raceBarChartMargin.top + raceBarChartMargin.bottom}`)
        .attr('class', 'bar')
        .append("g")
        .attr("transform", `translate(${raceBarChartMargin.left},${raceBarChartMargin.top})`);

    // Scales
    raceBarChartX = d3.scaleLinear().range([0, raceBarChartWidth]);
    raceBarChartY = d3.scaleBand().range([0, raceBarChartHeight]).padding(0.1);

    // Process and draw the chart
    raceBarChartData = preprocessRaceBarChartData(globalData); // Process data
    drawRaceBarChart(); // Draw initial chart
}

// Function to preprocess data
function preprocessRaceBarChartData(data) {
    const parseDate = d3.timeParse("%Y-%m-%d");
    const formatMonth = d3.timeFormat("%Y-%m");

    data.forEach(d => {
        d.dateNew = parseDate(d.date);
        d.total_cases = +d.total_cases;
    });

    // Aggregate data by location and month
    const aggregatedData = d3.rollup(
        data,
        v => d3.sum(v, d => d.total_cases),
        d => d.location,
        d => formatMonth(d.dateNew)
    );

    const flatData = [];
    aggregatedData.forEach((monthMap, location) => {
        monthMap.forEach((cases, month) => {
            flatData.push({ location, month, cases });
        });
    });

    // Extract unique months
    raceBarChartMonths = Array.from(new Set(flatData.map(d => d.month))).sort();

    return flatData;
}

// Function to get top 15 data for a given month
function getTop10RaceBarChartData(month) {
    const filteredData = raceBarChartData.filter(d => d.month === month);
    return filteredData.sort((a, b) => b.cases - a.cases).slice(0, 15);
}

// Function to update the chart for a specific month
function updateRaceBarChart(month) {
    raceBarChartColor.domain(raceBarChartData.map(d => d.location))
        .range(colorScale);
    const top10Data = getTop10RaceBarChartData(month);

    raceBarChartX.domain([0, d3.max(top10Data, d => d.cases)]);
    raceBarChartY.domain(top10Data.map(d => d.location));

    // Axes
    const xAxis = d3.axisTop(raceBarChartX).ticks(5).tickFormat(d3.format(".2s"));
    const yAxis = d3.axisLeft(raceBarChartY);

    raceBarChartSvg.select(".x-axis").transition().duration(750).call(xAxis);
    raceBarChartSvg.select(".y-axis").transition().duration(750).call(yAxis);

    // Bars
    const bars = raceBarChartSvg.selectAll(".bar").data(top10Data, d => d.location)
        .on("mouseover", function (event, d) { 
            d3.select(".tooltip").transition()
                .duration(200)
                .style("opacity", 0.9);
            d3.select(".tooltip").html(`Country: ${d.location}<br>Total Cases: ${d3.format(",")(d.cases)}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function () {
            d3.select(".tooltip").transition()
                .duration(500)
                .style("opacity", 0);
        });

    bars.enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", 0)
        .attr("y", d => raceBarChartY(d.location))
        .attr("width", 0)
        .attr("height", raceBarChartY.bandwidth())
        .style("fill", d => raceBarChartColor(d.location))
        .merge(bars)
        .transition()
        .duration(750)
        .attr("width", d => raceBarChartX(d.cases))
        .attr("y", d => raceBarChartY(d.location))


    bars.exit().transition().duration(750).attr("width", 0).remove();

    // Labels
    const labels = raceBarChartSvg.selectAll(".label").data(top10Data, d => d.location);

    labels.enter()
        .append("text")
        .attr("class", "label")
        .attr("x", d => raceBarChartX(d.cases) - 10)
        .attr("y", d => raceBarChartY(d.location) + raceBarChartY.bandwidth() / 2)
        .attr("dy", ".35em").style("fill", 'white')
        .style("text-anchor", "start")
        .text(d => d3.format(".2s")(d.cases))
        .merge(labels)
        .transition()
        .duration(750)
        .attr("x", d => raceBarChartX(d.cases) + 8)
        .attr("y", d => raceBarChartY(d.location) + raceBarChartY.bandwidth() / 2)
        .text(d => d3.format(".2s")(d.cases));

    labels.exit().remove();

    let [year, monthIndex] = month.split("-");
    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    const displayText = `${monthNames[parseInt(monthIndex, 10) - 1]} ${year}`;

    const dateDisplay = raceBarChartSvg.selectAll(".date-display")
        .data([displayText]);

    dateDisplay.enter()
        .append("text")
        .attr("class", "date-display")
        .attr("x", raceBarChartWidth - 10)
        .attr("y", raceBarChartHeight - 10)
        .style("text-anchor", "end")
        .style("font-size", "16px")
        .style("fill", "#555")
        .merge(dateDisplay)
        .text(displayText);


}

// Function to draw the initial race bar chart
function drawRaceBarChart() {
    const xAxis = d3.axisTop(raceBarChartX).ticks(5).tickFormat(d3.format(".2s"));
    const yAxis = d3.axisLeft(raceBarChartY);

    raceBarChartSvg.append("g").attr("class", "x-axis").call(xAxis);
    raceBarChartSvg.append("g").attr("class", "y-axis").call(yAxis);

    // Start the animation
    raceBarChartInterval = setInterval(() => {
        const currentMonth = raceBarChartMonths[raceBarChartIndex];
        updateRaceBarChart(currentMonth);
        raceBarChartIndex = (raceBarChartIndex + 1) % raceBarChartMonths.length;
    }, 1000);

    // Play/Pause Button
    d3.select("#playPauseBtn")
        .text("Pause")
        .on("click", startRaceBarChart);

    // Reset Button
    d3.select("#reset")
        .text("Reset")
        .on("click", stopRaceBarChart);
}

function startRaceBarChart() {
    if (raceBarChartIsPlaying) {
        clearInterval(raceBarChartInterval);
        raceBarChartInterval = null;
        raceBarChartIsPlaying = false;
        d3.select("#playPauseBtn").text("Play");
    } else {
        raceBarChartInterval = setInterval(() => {
            const currentMonth = raceBarChartMonths[raceBarChartIndex];
            updateRaceBarChart(currentMonth);
            raceBarChartIndex = (raceBarChartIndex + 1) % raceBarChartMonths.length;
        }, 1500);
        raceBarChartIsPlaying = true;
        d3.select("#playPauseBtn").text("Pause");
    }
}

// Function to stop and reset the race bar chart
function stopRaceBarChart() {
    clearInterval(raceBarChartInterval); // Stop the animation
    raceBarChartInterval = null;
    raceBarChartIndex = 0; // Reset index
    updateRaceBarChart(raceBarChartMonths[raceBarChartIndex]); // Reset to the first month
    raceBarChartIsPlaying = false; // Pause state
    d3.select("#playPauseBtn").text("Play"); // Update button text
}

function calenderChart(data) {
    d3.select('#visual3 svg').remove(); // Clear existing chart

    // Dropdown for country selection
    const uniqueCountries = [...new Set(data.map(d => d.location))];
    uniqueCountries.unshift("Worldwide"); // Add Worldwide as default

    // d3.select("#visual3-dropdown").remove(); // Remove previous dropdown, if exists
    const dropdown = d3.select("#visual3-dropdown")
        .on("change", function () {
            const selectedCountry = d3.select(this).property("value");
            updateChart(selectedCountry);
        });

    dropdown.selectAll("option")
        .data(uniqueCountries)
        .enter()
        .append("option")
        .text(d => d)
        .attr("value", d => d);

    const width = 960; // Overall chart width
    const cellSize = 17; // Cell size for each day
    const height = cellSize * 7 + 20; // Height per year

    const years = d3.range(2020, 2025); // Define the range of years to show

    // Initialize SVG
    const svg = d3.select("#visual3")
        .append("svg")
        .attr("width", width + 50)
        .attr("height", height * years.length + 50)
        .attr("viewBox", `0 0 ${width + 50} ${height * years.length + 50}`)
        .attr("font", "10px sans-serif")
        .append('g')
        .attr("transform", (d, i) => `translate(${(50) / 2},${10})`);

    function updateChart(selectedCountry) {
        // Filter data for the selected country or worldwide
        const filteredData = selectedCountry === "Worldwide"
            ? data
            : data.filter(d => d.location === selectedCountry);

        // Group data by date and compute total deaths for each day
        const dataMap = d3.rollup(
            filteredData,
            v => d3.sum(v, d => +d.total_deaths),
            d => d.date
        );

        // Compute the domain for the color scale
        const deathValues = Array.from(dataMap.values()).filter(d => d > 0);
        const colorDomain = d3.extent(deathValues);

        // Use a logarithmic color scale
        const color = d3.scaleSequentialLog()
            .domain([Math.max(1, colorDomain[0]), colorDomain[1]])
            .interpolator(d3.interpolateReds);

        // Remove previous content
        svg.selectAll("g").remove();

        const year = svg.selectAll(".year")
            .data(years)
            .enter().append("g")
            .attr("class", "year")
            .attr("transform", (d, i) => `translate(${(width - cellSize * 53) / 2},${i * (cellSize * 8)})`);

        year.append("text")
            .attr("x", -5)
            .attr("y", cellSize * 3.5)
            .attr("text-anchor", "end")
            .attr("font-size", 12)
            .attr("font-weight", "bold")
            .text(d => d);

        const formatDate = d3.timeFormat("%Y-%m-%d");

        const rect = year.selectAll(".day")
            .data(d => d3.timeDays(new Date(d, 0, 1), new Date(d + 1, 0, 1)))
            .enter().append("rect")
            .attr("class", "day")
            .attr("width", cellSize)
            .attr("height", cellSize)
            .attr("x", d => d3.timeWeek.count(d3.timeYear(d), d) * cellSize)
            .attr("y", d => d.getDay() * cellSize)
            .datum(formatDate)
            .attr("fill", "#eee")
            .on("mouseover", function (event, d) { 
                d3.select(".tooltip").transition()
                    .duration(200)
                    .style("opacity", 0.9);
                d3.select(".tooltip").html(`Date: ${d}<br>Total Deaths: ${d3.format(",")(dataMap.get(d))}`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function () {
                d3.select(".tooltip").transition()
                    .duration(500)
                    .style("opacity", 0);
            });

        // Update colors with animation
        rect.transition()
            .duration(1000)
            .attr("fill", d => {
                const deaths = dataMap.get(d);
                return deaths > 0 ? color(deaths) : "#eee";
            });

        year.append("g")
            .attr("fill", "none")
            .attr("stroke", "grey")
            .selectAll("path")
            .data(function (d) { return d3.timeMonths(new Date(d, 0, 1), new Date(d + 1, 0, 1)); })
            .enter().append("path")
            .attr("d", pathMonth);

        // Add legend
        svg.select(".legend").remove(); // Remove previous legend

        const legendWidth = 300;
        const legendHeight = 10;

        const legendScale = d3.scaleLog()
            .domain(color.domain())
            .range([0, legendWidth]);

        const legendAxis = d3.axisBottom(legendScale)
            .ticks(5, ",.1s");

        const legend = svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${(width - legendWidth) / 2},${height * years.length - 30 + 40})`);

        // Create gradient for legend
        const defs = svg.append("defs");

        const linearGradient = defs.append("linearGradient")
            .attr("id", "legend-gradient");

        linearGradient.selectAll("stop")
            .data(color.ticks(10).map((t, i, n) => ({
                offset: `${100 * i / (n.length - 1)}%`,
                color: color(t)
            })))
            .enter().append("stop")
            .attr("offset", d => d.offset)
            .attr("stop-color", d => d.color);

        legend.append("rect")
            .attr("width", legendWidth)
            .attr("height", legendHeight)
            .style("fill", "url(#legend-gradient)");

        legend.append("g")
            .attr("transform", `translate(0,${legendHeight})`)
            .call(legendAxis);

        legend.append("text")
            .attr("class", "caption")
            .attr("x", legendWidth / 2)
            .attr("y", -10)
            .attr("text-anchor", "middle")
            .text("Number of Deaths");
    }

    // Initial chart rendering
    updateChart("Worldwide");
}

function pathMonth(t0) {
    const cellSize = 17; // Cell size for each day
    var t1 = new Date(t0.getFullYear(), t0.getMonth() + 1, 0),
        d0 = t0.getDay(), w0 = d3.timeWeek.count(d3.timeYear(t0), t0),
        d1 = t1.getDay(), w1 = d3.timeWeek.count(d3.timeYear(t1), t1);
    return "M" + (w0 + 1) * cellSize + "," + d0 * cellSize
        + "H" + w0 * cellSize + "V" + 7 * cellSize
        + "H" + w1 * cellSize + "V" + (d1 + 1) * cellSize
        + "H" + (w1 + 1) * cellSize + "V" + 0
        + "H" + (w0 + 1) * cellSize + "Z";
}

function bubbleChart(data) {
    d3.select("#visual4 svg").remove();

    // Aggregate data
    const hierarchy = { name: "World", children: [], cases: 0 };
    const continents = {};

    data.forEach(entry => {
        const { continent, location, total_cases_per_million } = entry;
        const cases = parseFloat(total_cases_per_million || 0);

        if (!continent) return; // Skip entries without continent information

        if (!continents[continent]) {
            continents[continent] = { name: continent, children: {}, totalCases: 0 };
        }
        if (!continents[continent].children[location]) {
            continents[continent].children[location] = { name: location, cases: 0 };
        }
        continents[continent].children[location].cases += cases;
        continents[continent].totalCases += cases;
        hierarchy.cases += cases; // Accumulate total cases at the root level
    });

    for (const continent in continents) {
        const continentData = continents[continent];
        const continentNode = {
            name: continentData.name,
            children: [],
            cases: continentData.totalCases,
            continent: continentData.name
        };
        for (const country in continentData.children) {
            const countryData = continentData.children[country];
            continentNode.children.push({
                name: countryData.name,
                size: countryData.cases,
                continent: continentData.name
            });
        }
        hierarchy.children.push(continentNode);
    }

    const width = 1000,
        height = 800;

    // Define colors for each continent
    const continentColors = {
        'Africa': '#1f77b4',
        'Asia': '#ff7f0e',
        'Europe': '#2ca02c',
        'North America': '#d62728',
        'South America': '#9467bd',
        'Oceania': '#8c564b',
        'Antarctica': '#e377c2'
    };

    const root = d3.hierarchy(hierarchy).sum(d => d.size || d.cases);
    const nodes = root.descendants();
    const links = root.links();

    // Scale for node sizes
    const sizeScale = d3.scaleSqrt()
        .domain([0, d3.max(nodes, d => d.value || 1)])
        .range([5, 20]);

    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).distance(50).strength(0.7)) // Reduced distance
        .force("charge", d3.forceManyBody().strength(-30)) // Closer nodes
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collision", d3.forceCollide(d => sizeScale(d.value || 1) + 5));

    const svg = d3.select("#visual4").append("svg")
        .attr("preserveAspectRatio", "xMinYMin meet")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .call(d3.zoom() // Add zoom and pan
            .scaleExtent([0.5, 3]) // Zoom scale limits
            .on("zoom", event => svg.attr("transform", event.transform)))
        .append("g");

    // Draw links
    const link = svg.selectAll(".link")
        .data(links)
        .enter().append("line")
        .attr("class", "link")
        .style("stroke", "#aaa");

    // Draw nodes
    const node = svg.selectAll(".node")
        .data(nodes)
        .enter().append("circle")
        .attr("class", "node")
        .attr("r", d => sizeScale(d.value || 1)) // Scaled radius
        .style("fill", d => {
            if (d.depth === 0) {
                // Root node ("World")
                return 'blue'; // Distinct color (black)
            } else if (d.depth === 1) {
                // Continent nodes
                return continentColors[d.data.name] || '#cccccc'; // Continent color
            } else if (d.depth === 2) {
                // Country nodes
                const continentColor = continentColors[d.parent.data.name] || '#cccccc';
                const lighterColor = d3.color(continentColor).brighter(1).formatHex(); // Lighter shade
                return lighterColor;
            } else {
                return '#dddddd'; // Default color for other depths
            }
        })
        .call(drag(simulation))
        .on("mouseover", function (event, d) {
            const value = d.data.size || d.data.cases || 0;
            const type = d.depth === 0 ? "Total Cases per Million" : "Cases per Million";
            d3.select(".tooltip").transition()
                .duration(200)
                .style("opacity", 0.9);
            d3.select(".tooltip").html(`<b>${d.data.name}</b><br>${type}: ${d3.format(",.2f")(value)}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function () {
            d3.select(".tooltip").transition()
                .duration(500)
                .style("opacity", 0);
        });

    simulation.on("tick", () => {
        link.attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node.attr("cx", d => d.x)
            .attr("cy", d => d.y);
    });

    function drag(simulation) {
        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }

        return d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended);
    }
}


function sunburstChart(dataMain, level) {
    d3.select("#visual5 svg").remove();

    // Assuming transformDataforSunburst function prepares data with continent and country hierarchy
    const data = transformDataforSunburst(dataMain);

    // Specify the chart’s dimensions.
    const width = 1100;
    const height = 800;
    const radius = width / 9;

    const svg = d3.select("#visual5").append("svg")
        .attr("preserveAspectRatio", "xMinYMin meet")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .append('g')
        .attr('transform', `translate(${width / 2},${height / 2})`);

    const sunburstG = svg.append('g');

    // Define continent colors
    const continentColors = {
        'Africa': '#1f77b4',
        'Asia': '#ff7f0e',
        'Europe': '#2ca02c',
        'North America': '#d62728',
        'South America': '#9467bd',
        'Oceania': '#8c564b',
        'Antarctica': '#e377c2',
        'World': '#999999' // Default color for root node
    };

    // Create the color scale.
    const color = d => {
        // Assign colors based on the continent
        if (d.depth === 1) {
            // Continent level
            return continentColors[d.data.name] || '#cccccc';
        } else if (d.depth === 2) {
            // Country level
            const continent = d.parent.data.name;
            const continentColor = continentColors[continent] || '#cccccc';
            // Generate a lighter shade for countries
            return d3.color(continentColor).brighter(0.5);
        } else {
            // Other levels
            return '#dddddd';
        }
    };

    // Compute the layout.
    const hierarchy = d3.hierarchy(data)
        .sum(d => d.value)
        .sort((a, b) => b.value - a.value);

    const root = d3.partition()
        .size([2 * Math.PI, hierarchy.height + 1])
        (hierarchy);

    root.each(d => d.current = d);

    // Create the arc generator.
    const arc = d3.arc()
        .startAngle(d => d.x0)
        .endAngle(d => d.x1)
        .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
        .padRadius(radius * 1.5)
        .innerRadius(d => d.y0 * radius)
        .outerRadius(d => d.y1 * radius - 1);

    // Append the arcs. 
    // Append the arcs.
    const path = sunburstG.append("g")
        .selectAll("path")
        .data(root.descendants().slice(1))
        .join("path")
        .attr("fill", d => {
            if (d.depth === 1) {
                // Continent level
                return continentColors[d.data.name] || '#cccccc';
            } else if (d.depth === 2) {
                // Country level
                const continent = d.parent.data.name;
                const continentColor = continentColors[continent] || '#cccccc';
                return d3.color(continentColor).brighter(0.5);
            } else if (d.depth > 2) {
                // Last level
                const parent = d.parent;
                if (
                    parent.children &&
                    parent.children.length === 2 &&
                    parent.children[0].data.name === "Population" &&
                    parent.children[1].data.name === "People vaccinated"
                ) {
                    // Use the same continent color for consistency
                    const continent = parent.parent.data.name;
                    const continentColor = continentColors[continent] || '#cccccc';
                    return d3.color(continentColor).brighter(0.7);
                } else {
                    return '#dddddd';
                }
            } else {
                return '#dddddd';
            }
        })
        .attr("fill-opacity", d => arcVisible(d.current) ? (d.children ? 0.6 : 0.4) : 0)
        .attr("pointer-events", d => arcVisible(d.current) ? "auto" : "none")
        .attr("d", d => arc(d.current));

    // Make them clickable if they have children.
    path.filter(d => d.children)
        .style("cursor", "pointer")
        .on("click", clicked);

    const format = d3.format(",d");
    path.append("title")
        .text(d => `${d.ancestors().map(d => d.data.name).reverse().join("/")}\n${format(d.value)}`);

    const label = sunburstG.append("g")
        .attr("pointer-events", "none")
        .attr("text-anchor", "middle")
        .style("user-select", "none")
        .selectAll("text")
        .data(root.descendants().slice(1))
        .join("text")
        .style("font-size", "9px")
        .attr("dy", "0.35em")
        .attr("fill-opacity", d => +labelVisible(d.current))
        .attr("transform", d => labelTransform(d.current))
        .text(d => d.data.name);

    const parent = sunburstG.append("circle")
        .datum(root)
        .attr("r", radius)
        .attr("fill", "none")
        .attr("pointer-events", "all")
        .on("click", clicked);

    // Handle zoom on click.
    function clicked(event, p) {
        parent.datum(p.parent || root);

        root.each(d => d.target = {
            x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
            x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
            y0: Math.max(0, d.y0 - p.depth),
            y1: Math.max(0, d.y1 - p.depth)
        });

        const t = sunburstG.transition().duration(750);

        // Check if the clicked node is a country with Population and People vaccinated
        if (p.children && p.children[0].data.name === "Population" && p.children[1].data.name === "People vaccinated") {
            lastLevel = true;
            renderRadialBars(p);
            return;
        }

        path.transition(t)
            .tween("data", d => {
                const i = d3.interpolate(d.current, d.target);
                return t => d.current = i(t);
            })
            .filter(function (d) {
                return +this.getAttribute("fill-opacity") || arcVisible(d.target);
            })
            .attr("fill-opacity", d => arcVisible(d.target) ? (d.children ? 0.6 : 0.4) : 0)
            .attr("pointer-events", d => arcVisible(d.target) ? "auto" : "none")
            .attrTween("d", d => () => arc(d.current));

        label.filter(function (d) {
            return +this.getAttribute("fill-opacity") || labelVisible(d.target);
        }).transition(t)
            .attr("fill-opacity", d => +labelVisible(d.target))
            .attrTween("transform", d => () => labelTransform(d.current));
    }

    function renderRadialBars(node) {
        // Fade out the sunburst chart
        sunburstG.style('opacity', 0.75);

        // Remove existing radial bars if any
        svg.select('#radial').remove();

        const radialG = svg.append('g').attr('id', 'radial');

        // Extract values
        const values = node.children.reduce((acc, child) => {
            acc[child.data.name] = child.value;
            return acc;
        }, {});

        // Assuming maxPopulation and vaccinated are already defined
        const maxPopulation = values["Population"];
        const vaccinated = values["People vaccinated"];

        // Get the continent color
        const continentName = node.parent.data.name; // Parent is the continent
        const continentColor = continentColors[continentName] || "#00aaff"; // Default color if continent not found

        // Define arc generators with rounded edges
        const arcGenerator = d3.arc()
            .innerRadius(radius * 0.6)
            .outerRadius(radius * 0.9)
            .cornerRadius(20);

        const backgroundArc = d3.arc()
            .innerRadius(radius * 0.6)
            .outerRadius(radius * 0.9)
            .startAngle(0)
            .endAngle(2 * Math.PI)
            .cornerRadius(20);

        // Draw background arc (total population)
        radialG.append("path")
            .attr("d", backgroundArc)
            .attr("fill", "#e6e6e6");

        // Draw foreground arc (vaccinated people)
        const vaccinatedArc = arcGenerator
            .startAngle(0)
            .endAngle((vaccinated / maxPopulation) * 2 * Math.PI);

        radialG.append("path")
            .attr("d", vaccinatedArc)
            .attr("fill", continentColor); // Use continent color


        // Add Population Text
        radialG.append("text")
            .attr("text-anchor", "middle")
            .attr("y", -radius * 0.5)
            .style("font-size", "14px")
            .text(`Population: ${d3.format(",")(maxPopulation)}`);

        // Add Vaccinated Text
        radialG.append("text")
            .attr("text-anchor", "middle")
            .attr("y", -radius * 0.35)
            .style("font-size", "14px")
            .text(`Vaccinated: ${d3.format(",")(vaccinated)}`);

        radialG.append("text")
            .attr("text-anchor", "middle")
            .attr("dy", radius * 0.05)
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .style("cursor", "pointer")
            .text(node.data.name);
        // Add Percentage Text
        radialG.append("text")
            .attr("text-anchor", "middle")
            .attr("y", -radius * 0.2)
            .style("font-size", "14px")
            .text(`(${((vaccinated / maxPopulation) * 100).toFixed(2)}%)`);

        // Add a clickable transparent circle to return to the previous level
        radialG.append("circle")
            .attr("r", radius * 0.3)
            .attr("fill", "transparent")
            .style("cursor", "pointer")
            .on("click", (event) => {
                radialG.remove();
                sunburstG.style('opacity', 1);
                clicked(event, node.parent);
            });



    }

    function arcVisible(d) {
        return d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0;
    }

    function labelVisible(d) {
        return d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03;
    }

    function labelTransform(d) {
        const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
        const y = (d.y0 + d.y1) / 2 * radius;
        return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
    }
}


function transformDataforSunburst(data) {
    // Define the hierarchical structure
    const result = {
        name: "World",
        children: []
    };

    // Filter out data without continent information
    data = data.filter(d => d.continent !== '');

    // Group data by continent
    const continents = {};

    data.forEach(item => {
        const continent = item.continent;
        const country = item.location;
        const fullyVaccinated = parseFloat(item.people_fully_vaccinated || "0");
        const population = parseFloat(item.population || "0");

        if (!continents[continent]) {
            continents[continent] = {};
        }

        if (!continents[continent][country]) {
            continents[continent][country] = {
                last_fully_vaccinated: 0,
                population: 0,
                dates: [] // Keep track of dates to sort later
            };
        }

        // Accumulate values
        continents[continent][country].population = population; // Assume population is static
        if (fullyVaccinated > 0) {
            continents[continent][country].last_fully_vaccinated = fullyVaccinated;
            continents[continent][country].dates.push({ date: item.date, fully_vaccinated: fullyVaccinated });
        }
    });

    // Ensure we get the last non-blank fully vaccinated value for each country
    for (const continent in continents) {
        for (const country in continents[continent]) {
            const countryData = continents[continent][country];
            if (countryData.dates.length > 0) {
                // Sort dates in ascending order and get the latest non-blank value
                countryData.dates.sort((a, b) => new Date(a.date) - new Date(b.date));
                countryData.last_fully_vaccinated = countryData.dates[countryData.dates.length - 1].fully_vaccinated;
            }
        }
    }

    // Convert the structured data into hierarchical format
    for (const [continentName, countries] of Object.entries(continents)) {
        const continentNode = {
            name: continentName,
            children: []
        };

        for (const [countryName, values] of Object.entries(countries)) {
            const countryNode = {
                name: countryName,
                children: [
                    { name: "Population", value: values.population },
                    { name: "People vaccinated", value: values.last_fully_vaccinated }
                ]
            };
            continentNode.children.push(countryNode);
        }

        result.children.push(continentNode);
    }

    return result;
}



