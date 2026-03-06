import { procurementHandlers } from './handlers/procurement';
import { catalogueHandlers } from './handlers/catalogue';

/**
 * Handler order matters:
 * - Procurement first so /purchase-orders/transition resolves before /purchase-orders/:id
 * - Catalogue next so /catalogue/categories and /catalogue/suppliers resolve before /catalogue/:id
 */
export const handlers = [...procurementHandlers, ...catalogueHandlers];
