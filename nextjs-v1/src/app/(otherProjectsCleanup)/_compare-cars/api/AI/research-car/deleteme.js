/* 
You are NextjsV1 AI, an expert automotive financial analyst specializing in the Israeli car market.
Your job is to get a comperhensive data report (as a structured object) about the car that the user is asking for. 
The user will use this data to compare the car to other cars in the market in our app's UI.

I'll now provide you with the exact instructuons that you need to follow, and then i'll give provide you with a updated data that we've just now scrapped, so you'll have a good view on the current market.

The format of the data report will be in JSON format, and it'll have the following fields:
- car_name
- market_analysis:  - <based on the real listings (provided below) if available, otherwise based on the baseline data>
{
    average_price: number;
    price_range_min: number;
    price_range_max: number;
    market_availability: string;
    depreciation_reasoning: string; <short explanation of the depreciation calculation>
    depreciation_data_source: DepreciationSource; <'actual_listings' | 'baseline_adjusted' | 'mixed'>
    car_purchase_age?: number; <The age of the car at purchase (0 for new), for example if we're at 2025, and the user looks for a 2020 car, the car_purchase_age should be 5>
}
- current_listings (TOOD: FIX IT! - SHOULD BE PROVIDED TO IT, THE AI DOESN'T NEED TO GENERATE IT!)
{
    title: string;
    price: number;
    year: number;
    mileage: number;
    location: string;
    seller_type: 'dealer' | 'private';
}
** DATA TO GET FROM YOUR OWN ONLINE RESEARCH: **
- fuel_type: <'gasoline' | 'hybrid' | 'electric' | 'diesel'>
- fuel_consumption: <based on your online research for this exact car model and manufacuring year baseline is 6L/100KM for gasoline, 4L/100KM for hybrid>
- depreciation_percentages: <based on the data provided below or based on the baseline data>
- maintenance_costs: <check online and use the estimation data provided below>
- annual_insurance: <check online, baseline is 1500 NIS for compulsory insurance>
- registration_cost: <check online, baseline is 1200 NIS>
- annual_tax: <check online, baseline is 400 NIS>
- extended_warranty: < check online, baseline is 3500 NIS for full coverage>

** MAINTENANCE COSTS BASELINE: **
- maintenance_costs - gasoline (year by year from new car to 6 years old): [2000, 2500, 3000, 3500, 4000, 4500, 5000]
- maintenance_costs - hybrid (year by year): [1500, 2000, 2500, 3000, 3500, 4000, 4500]
- maintenance_costs - electric (year by year): [500, 500, 1000, 1500, 2000, 2000, 2500]
- Adjust for brand (luxury +50-100%, reliable -20-30%, electric -40-60%)


**DEPRECIATION CALCULATION:**
depericiation_percentages = [15, 15, 15, 13, 13, 13, 13] 
(New Car - First year of ownership is 15%, then 15% for the second year, and after 3 years it's 13% per year)
- brand depreciation adjustments: {"luxury":2.5,"reliable":-1.5,"electric":4,"chinese":3.5}

        If you have actual listings - also base you calculations on the ACTUAL depreciation from the real price differences in the listings below.
        Group listings by year and calculate the average price drop year-over-year.


**MARKET ANALYSIS:**
- Provide the average price based on your online research (including new car prices, and second hand market) and the actual listings below
- Show price range (min to max) based of your online research and based of real data
- Assess market availability
- Set depreciation_data_source to "actual_listings"


**REQUIRED OUTPUT FORMAT:**
- Exactly 7 numbers in depreciation_percentages array <baseline is 14% per year (higher for new cars, luxury cars, chinese cars) (range from 5% to 20%)>
- Exactly 7 numbers in maintenance_costs array <baseline is 3500 NIS for gasoline, 4000 NIS for hybrid, 1200 NIS for electric>
- research_confidence: "high"

IMPORTANT: Your response MUST be based on the actual Yad2 listings provided above.

-----------------------------------------------------
HERE'S THE USER SIMPLIFIED QUERY WAS : "Kia Niro Hybrid 2022
"

Kia  / קיהis the manufacturer name
and are the model's details : aliases: Niro Hybrid, נירו היבריד, Niro Hybrid, Niro HEV, Kia Niro Hybrid, Kia Niro HEV, נירו היבריד, קיה נירו היבריד, נירו, קיה נירו




** REAL LISTINGS DATA GATHERED JUST NOW FROM YAD2: **
We found 120 ACTUAL listings from Yad2 for this car model.
Here are the real listings data:
{"title":"נירו 2018","price":65000,"year":2018,"link":"g5rvgkj9","hand":"יד ראשונה"}

{"title":"נירו 2018","price":75000,"year":2018,"link":"v6cmnxvw","hand":"יד ראשונה"}

{"title":"נירו 2018","price":79000,"year":2018,"link":"rszznjzu","hand":"יד ראשונה"}

{"title":"נירו 2019","price":82900,"year":2019,"link":"uaoo14f7","hand":"יד ראשונה"}

{"title":"נירו 2018","price":83000,"year":2018,"link":"iw5n9897","hand":"יד ראשונה"}

{"title":"נירו 2019","price":84000,"year":2019,"link":"br74pv5h","hand":"יד ראשונה"}

{"title":"נירו 2018","price":84000,"year":2018,"link":"m0wc8bxw","hand":"יד ראשונה"}

{"title":"נירו 2018","price":86000,"year":2018,"link":"75ap5uze","hand":"יד ראשונה"}

{"title":"נירו 2018","price":88000,"year":2018,"link":"d4ulj77f","hand":"יד ראשונה"}

{"title":"נירו 2019","price":89000,"year":2019,"link":"be3o4yel","hand":"יד ראשונה"}

{"title":"נירו 2018","price":89000,"year":2018,"link":"gvnk3kvl","hand":"יד ראשונה"}

{"title":"נירו 2018","price":89525,"year":2018,"link":"s6v8uf7u","hand":"יד ראשונה"}

{"title":"נירו 2019","price":89995,"year":2019,"link":"q5rrvdl7","hand":"יד ראשונה"}

{"title":"נירו 2021","price":90000,"year":2021,"link":"peoz63tm","hand":"יד ראשונה"}

{"title":"נירו 2018","price":90000,"year":2018,"link":"pzdoy382","hand":"יד ראשונה"}

{"title":"נירו 2018","price":90000,"year":2018,"link":"p3obg0ze","hand":"יד ראשונה"}

{"title":"נירו 2018","price":92000,"year":2018,"link":"3kd9x7vy","hand":"יד ראשונה"}

{"title":"נירו 2019","price":92500,"year":2019,"link":"7gxhc1yy","hand":"יד ראשונה"}

{"title":"נירו 2019","price":92965,"year":2019,"link":"ttt3wfgz","hand":"יד ראשונה"}

{"title":"נירו 2021","price":93000,"year":2021,"link":"qr9gruoh","hand":"יד ראשונה"}

{"title":"נירו 2021","price":93000,"year":2021,"link":"2chxvkjn","hand":"יד ראשונה"}

{"title":"נירו 2019","price":94000,"year":2019,"link":"hscz3dch","hand":"יד ראשונה"}

{"title":"נירו 2019","price":95000,"year":2019,"link":"e8r9k9pl","hand":"יד ראשונה"}

{"title":"נירו 2019","price":95000,"year":2019,"link":"tg0y7hda","hand":"יד ראשונה"}

{"title":"נירו 2019","price":95000,"year":2019,"link":"483e35xa","hand":"יד ראשונה"}

{"title":"נירו 2019","price":95000,"year":2019,"link":"dtab2mt2","hand":"יד ראשונה"}

{"title":"נירו 2019","price":95000,"year":2019,"link":"xx3y66cl","hand":"יד ראשונה"}

{"title":"נירו 2018","price":96000,"year":2018,"link":"tpj3tut0","hand":"יד ראשונה"}

{"title":"נירו 2018","price":96000,"year":2018,"link":"s4kkpi87","hand":"יד ראשונה"}

{"title":"נירו 2019","price":97000,"year":2019,"link":"1ye1ov6m","hand":"יד ראשונה"}

{"title":"נירו 2019","price":97000,"year":2019,"link":"74zvuti2","hand":"יד ראשונה"}

{"title":"נירו 2019","price":97000,"year":2019,"link":"7sbksrfk","hand":"יד ראשונה"}

{"title":"נירו 2019","price":97500,"year":2019,"link":"4oubc5bq","hand":"יד ראשונה"}

{"title":"נירו 2019","price":98800,"year":2019,"link":"w1tucmf5","hand":"יד ראשונה"}

{"title":"נירו 2021","price":99500,"year":2021,"link":"yg53l1kg","hand":"יד ראשונה"}

{"title":"נירו 2021","price":99500,"year":2021,"link":"l6z7naq0","hand":"יד ראשונה"}

{"title":"נירו 2020","price":100000,"year":2020,"link":"3rnyqngj","hand":"יד ראשונה"}

{"title":"נירו 2019","price":100000,"year":2019,"link":"95jjyib4","hand":"יד ראשונה"}

{"title":"נירו 2019","price":102725,"year":2019,"link":"rlte4gdn","hand":"יד ראשונה"}

{"title":"נירו 2019","price":102725,"year":2019,"link":"urxrodbe","hand":"יד ראשונה"}

{"title":"נירו 2020","price":102800,"year":2020,"link":"cxb5stjo","hand":"יד ראשונה"}

{"title":"נירו 2021","price":105000,"year":2021,"link":"u3st0vjg","hand":"יד ראשונה"}

{"title":"נירו 2019","price":105284,"year":2019,"link":"bp5088fx","hand":"יד ראשונה"}

{"title":"נירו 2019","price":105715,"year":2019,"link":"bwuiv0vl","hand":"יד ראשונה"}

{"title":"נירו 2020","price":108000,"year":2020,"link":"4u0ddl0m","hand":"יד ראשונה"}

{"title":"נירו 2020","price":108925,"year":2020,"link":"dhfspbfi","hand":"יד ראשונה"}

{"title":"נירו 2021","price":109000,"year":2021,"link":"j061gn2h","hand":"יד ראשונה"}

{"title":"נירו 2021","price":109900,"year":2021,"link":"3qeh1ngj","hand":"יד ראשונה"}

{"title":"נירו 2019","price":109995,"year":2019,"link":"r2srful2","hand":"יד ראשונה"}

{"title":"נירו 2021","price":110000,"year":2021,"link":"03tuyown","hand":"יד ראשונה"}

{"title":"נירו 2021","price":110000,"year":2021,"link":"fg02l5j7","hand":"יד ראשונה"}

{"title":"נירו 2020","price":110000,"year":2020,"link":"8z6fao8o","hand":"יד ראשונה"}

{"title":"נירו 2020","price":110000,"year":2020,"link":"16j51o6n","hand":"יד ראשונה"}

{"title":"נירו 2019","price":110000,"year":2019,"link":"b6spzqib","hand":"יד ראשונה"}

{"title":"נירו 2020","price":110500,"year":2020,"link":"8jhblesq","hand":"יד ראשונה"}

{"title":"נירו 2021","price":110976,"year":2021,"link":"bi6g0vfi","hand":"יד ראשונה"}

{"title":"נירו 2020","price":111145,"year":2020,"link":"l8fvrcnd","hand":"יד ראשונה"}

{"title":"נירו 2021","price":111821,"year":2021,"link":"zh3r8okm","hand":"יד ראשונה"}

{"title":"נירו 2022","price":112000,"year":2022,"link":"k5frf48c","hand":"יד ראשונה"}

{"title":"נירו 2020","price":112000,"year":2020,"link":"xe20h682","hand":"יד ראשונה"}

{"title":"נירו 2020","price":115000,"year":2020,"link":"djhj90zw","hand":"יד ראשונה"}

{"title":"נירו 2021","price":115000,"year":2021,"link":"cnkq1yyp","hand":"יד ראשונה"}

{"title":"נירו 2021","price":115000,"year":2021,"link":"uriz05qx","hand":"יד ראשונה"}

{"title":"נירו 2021","price":115000,"year":2021,"link":"ei14sa23","hand":"יד ראשונה"}

{"title":"נירו 2021","price":115000,"year":2021,"link":"sma6ct8e","hand":"יד ראשונה"}

{"title":"נירו 2021","price":115720,"year":2021,"link":"8y6wv93d","hand":"יד ראשונה"}

{"title":"נירו 2021","price":116000,"year":2021,"link":"oy9wb4u5","hand":"יד ראשונה"}

{"title":"נירו 2021","price":116500,"year":2021,"link":"32eiqybv","hand":"יד ראשונה"}

{"title":"נירו 2021","price":117000,"year":2021,"link":"04u0tglb","hand":"יד ראשונה"}

{"title":"נירו 2021","price":117000,"year":2021,"link":"qsaddghk","hand":"יד ראשונה"}

{"title":"נירו 2022","price":118000,"year":2022,"link":"yo8tbuo5","hand":"יד ראשונה"}

{"title":"נירו 2022","price":118900,"year":2022,"link":"nuxk3s3o","hand":"יד ראשונה"}

{"title":"נירו 2021","price":119255,"year":2021,"link":"i2hr2k4w","hand":"יד ראשונה"}

{"title":"נירו 2022","price":120000,"year":2022,"link":"9qa6c9sh","hand":"יד ראשונה"}

{"title":"נירו 2021","price":120000,"year":2021,"link":"5g4gvz75","hand":"יד ראשונה"}

{"title":"נירו 2021","price":120000,"year":2021,"link":"ej6ppq8d","hand":"יד ראשונה"}

{"title":"נירו 2021","price":120000,"year":2021,"link":"bwc1tfo9","hand":"יד ראשונה"}

{"title":"נירו 2021","price":121000,"year":2021,"link":"73l1n5mb","hand":"יד ראשונה"}

{"title":"נירו 2022","price":122000,"year":2022,"link":"2dld3vhl","hand":"יד ראשונה"}

{"title":"נירו 2022","price":122000,"year":2022,"link":"62mf7c2w","hand":"יד ראשונה"}

{"title":"נירו 2021","price":123000,"year":2021,"link":"0i1x0uyu","hand":"יד ראשונה"}

{"title":"נירו 2022","price":124505,"year":2022,"link":"hwkv8eg4","hand":"יד ראשונה"}

{"title":"נירו 2021","price":125453,"year":2021,"link":"spjwp80i","hand":"יד ראשונה"}

{"title":"נירו 2022","price":126000,"year":2022,"link":"uqhaf9s9","hand":"יד ראשונה"}

{"title":"נירו 2021","price":126600,"year":2021,"link":"lwkhcfp2","hand":"יד ראשונה"}

{"title":"נירו 2021","price":127000,"year":2021,"link":"s7gmu4tg","hand":"יד ראשונה"}

{"title":"נירו 2022","price":128600,"year":2022,"link":"lrq4k6k1","hand":"יד ראשונה"}

{"title":"נירו 2022","price":128626,"year":2022,"link":"bcvbd9t4","hand":"יד ראשונה"}

{"title":"נירו 2023","price":129000,"year":2023,"link":"6me46hck","hand":"יד ראשונה"}

{"title":"נירו 2022","price":129000,"year":2022,"link":"u2demozx","hand":"יד ראשונה"}

{"title":"נירו 2024","price":129900,"year":2024,"link":"hmya2zoo","hand":"יד ראשונה"}

{"title":"נירו 2022","price":133500,"year":2022,"link":"9jo3b81n","hand":"יד ראשונה"}

{"title":"נירו 2022","price":133555,"year":2022,"link":"de5whor2","hand":"יד ראשונה"}

{"title":"נירו 2022","price":134000,"year":2022,"link":"47202ja0","hand":"יד ראשונה"}

{"title":"נירו 2022","price":134900,"year":2022,"link":"w5xbland","hand":"יד ראשונה"}

{"title":"נירו 2022","price":135000,"year":2022,"link":"z7dg7zyn","hand":"יד ראשונה"}

{"title":"נירו 2022","price":136000,"year":2022,"link":"6x4yi75k","hand":"יד ראשונה"}

{"title":"נירו 2024","price":136900,"year":2024,"link":"wcrhm6qj","hand":"יד ראשונה"}

{"title":"נירו 2024","price":136900,"year":2024,"link":"4kpw2ute","hand":"יד ראשונה"}

{"title":"נירו 2024","price":138000,"year":2024,"link":"r8e5816z","hand":"יד ראשונה"}

{"title":"נירו 2023","price":139900,"year":2023,"link":"pvzwg6ud","hand":"יד ראשונה"}

{"title":"נירו 2022","price":141700,"year":2022,"link":"sptq220c","hand":"יד ראשונה"}

{"title":"נירו 2024","price":143900,"year":2024,"link":"in4eobil","hand":"יד ראשונה"}

{"title":"נירו 2023","price":150000,"year":2023,"link":"chz6bj5y","hand":"יד ראשונה"}

{"title":"נירו 2023","price":154000,"year":2023,"link":"20k0o0js","hand":"יד ראשונה"}

{"title":"נירו 2023","price":154025,"year":2023,"link":"rneidn0f","hand":"יד ראשונה"}

{"title":"נירו 2025","price":158995,"year":2025,"link":"hu56imfy","hand":"יד ראשונה"}

{"title":"נירו 2024","price":159685,"year":2024,"link":"xfb2vyof","hand":"יד ראשונה"}

{"title":"נירו 2025","price":165990,"year":2025,"link":"5e1b18u5","hand":"יד ראשונה"}

{"title":"נירו 2025","price":165990,"year":2025,"link":"h51nt6ka","hand":"יד ראשונה"}

{"title":"נירו 2025","price":165990,"year":2025,"link":"jielfy7k","hand":"יד ראשונה"}

{"title":"נירו 2025","price":165990,"year":2025,"link":"4dhsaxq3","hand":"יד ראשונה"}

{"title":"נירו 2025","price":165990,"year":2025,"link":"73svenk7","hand":"יד ראשונה"}

{"title":"נירו 2025","price":165990,"year":2025,"link":"9y1nuojg","hand":"יד ראשונה"}

{"title":"נירו 2025","price":165990,"year":2025,"link":"l0mydbto","hand":"יד ראשונה"}

{"title":"נירו 2025","price":165990,"year":2025,"link":"q9355875","hand":"יד ראשונה"}

{"title":"נירו 2025","price":165990,"year":2025,"link":"9wgbb77j","hand":"יד ראשונה"}

{"title":"נירו 2025","price":165990,"year":2025,"link":"ocx9gcjf","hand":"יד ראשונה"}

{"title":"נירו 2025","price":165990,"year":2025,"link":"rnvnyulg","hand":"יד ראשונה"}

{"title":"נירו 2025","price":171490,"year":2025,"link":"is8tdsgb","hand":"יד ראשונה"}




Based on these REAL listings:
1. Calculate the actual average price and price range from the data above
2. Determine year-over-year depreciation by comparing prices across different years
3. Note the price differences between dealer and private sellers
4. Use the actual locations from the listings
5. Base ALL your analysis on this real data


-----------------------------------------------------
WEB SEARCH DATA GATHERED JUST NOW FOR THIS CAR:
1. **Current Market Data (Israel 2025):**  
- New price: ~165,000-180,000 NIS (2025 model, hybrid)  
- Used prices (2019-2024): 110,000-150,000 NIS depending on year and condition  
- Popularity rank: 7/10 (well-liked hybrid SUV)  

2. **Technical Specifications:**  
- Fuel type: Hybrid (gasoline + electric)  
- Official fuel consumption: Hybrid ~4.5-4.7 L/100KM (combined cycle)  

3. **Maintenance & Reliability:**  
- Brand reliability: 8/10 (Kia known for solid hybrids)  
- Common maintenance issues: 3/10 (few reported problems)  
- Average annual maintenance cost: ~4000 NIS (hybrid baseline)  

4. **Depreciation Insights:**  
- Depreciation rate: ~12.5% per year (slightly better than baseline due to Kia reliability)  

5. **Market Insights:**  
- Efficient hybrid SUV  
- Practical family car  
- Good resale value  
- Moderate maintenance costs  

6. **General Research:**  
- Car class: 5/10 (mid-range compact SUV)  
- Reliability: 8/10  
- Maintenance cost: 4/10 (affordable to maintain)  

Summary: The 2022 Kia Niro Hybrid in Israel is a popular, efficient hybrid SUV priced around 165,000-180,000 NIS new, with used models from 110,000 NIS. It offers good fuel economy (~4.6 L/100KM), strong reliability, moderate maintenance costs (~4000 NIS/year), and holds value well with ~12.5% annual depreciation. It ranks 7/10 in popularity locally.

*/
