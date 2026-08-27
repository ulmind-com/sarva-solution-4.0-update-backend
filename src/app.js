import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger.js';
import errorHandler from './middlewares/error/errorHandler.js'; // Updated path
import v1Routes from './routes/v1/index.js'; // Updated path

const app = express();

/**
 * Standard Middlewares
 */
app.use(express.json({ limit: '50mb' })); // Increased limit just in case
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cors());
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(morgan('dev'));

/**
 * Documentation
 */
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * Centralized v1 Routes
 */
app.use('/api/v1', v1Routes);

app.get('/', (req, res) => {
    res.json({ message: 'SarvaSolution Backend API is active (Enterprise V1)' });
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', timestamp: new Date() });
});

/**
 * Global Error Handling Middleware
 */
app.use(errorHandler);

export default app;
