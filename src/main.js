/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    const { discount, sale_price, quantity } = purchase;
    return sale_price * quantity * (1 - (discount / 100));
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    const { profit } = seller;
    
    if (index === 0) {
        return +(profit * 0.15).toFixed(2);
    } else if (index === 1 || index === 2) {
        return +(profit * 0.10).toFixed(2);
    } else if (index === total - 1) {
        return 0;
    } else { 
        return +(profit * 0.05).toFixed(2);
    }
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    validateInputData(data);
    const { calculateRevenue, calculateBonus } = validateOptions(options);
    
    const sellerStats = prepareSellerStats(data.sellers);
    const { sellerIndex, productIndex } = createIndexes(data, sellerStats);
    
    data.purchase_records.forEach(record => { 
        const seller = sellerIndex[record.seller_id];

        sellerStats.map(item => {
            if (item.id === seller.id) {
                item.sales_count++;
                item.revenue += +record.total_amount;
            }
        })

        
        record.items.forEach(item => {
            const product = productIndex[item.sku];
            const cost = product.purchase_price * item.quantity;
            const rev = calculateRevenue(item);

            sellerStats.map(value => {
                if (value.id === seller.id) {
                    value.profit += rev - cost;
                    
                    if (!value.products_sold[item.sku]) {
                        value.products_sold[item.sku] = 0;
                    }
                    
                    value.products_sold[item.sku] += item.quantity;
                }
            })
        });
    });
    
    sellerStats.sort((a, b) => b.profit - a.profit);
    
    calculateBonusesAndTopProducts(sellerStats, calculateBonus);
    
    return formatResult(sellerStats);
}

const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

function validateInputData(data) {
    if (!data 
        || !Array.isArray(data.sellers) || data.sellers.length === 0
        || !Array.isArray(data.products) || data.products.length === 0
        || !Array.isArray(data.purchase_records) || data.purchase_records.length === 0
    ) {
        throw new Error('Некорректные входные данные');
    }
}

function validateOptions(options) {
    const { calculateRevenue, calculateBonus } = options;
    if (!calculateRevenue || !calculateBonus) {
        throw new Error('Не переданы необходимые функции для расчётов');
    }
    return { calculateRevenue, calculateBonus };
}

function prepareSellerStats(sellers) {
    return sellers.map(seller => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {}
    }));
}

function createIndexes(data, sellerStats) {
    const sellerIndex = sellerStats.reduce((acc, seller) => {
        acc[seller.id] = seller;
        return acc;
    }, {});

    const productIndex = data.products.reduce((acc, product) => {
        acc[product.sku] = product;
        return acc;
    }, {});

    return { sellerIndex, productIndex };
}


function processPurchaseRecords(records, sellerIndex, productIndex, calculateRevenue) {
    records.forEach(record => {
        const seller = sellerIndex[record.seller_id];
        if (!seller) return;

        seller.sales_count += 1;
        
        let receiptRevenue = 0;
        let receiptProfit = 0;

        record.items.forEach(item => {
            const product = productIndex[item.sku];
            //if (!product) return;

            const itemRevenue = calculateRevenue(item);
            const itemCost = product.purchase_price * item.quantity;
            const itemProfit = itemRevenue - itemCost;

            receiptRevenue += itemRevenue;
            receiptProfit += itemProfit;

            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] += item.quantity;
        });

        seller.revenue += receiptRevenue;  
        seller.profit += receiptProfit;    
    });
}

function calculateBonusesAndTopProducts(sellerStats, calculateBonus) {
    sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonus(index, sellerStats.length, seller);
        
        seller.top_products = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
    });
}

function formatResult(sellerStats) {
    return sellerStats.map(seller => {
        return {
            seller_id: seller.id,
            name: seller.name,
            revenue: +seller.revenue.toFixed(2), 
            profit: +seller.profit.toFixed(2), 
            sales_count: seller.sales_count,
            top_products: seller.top_products,
            bonus: seller.bonus
        };
    });
}


