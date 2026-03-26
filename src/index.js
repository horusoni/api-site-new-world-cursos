import express from "express";
import cors from "cors";
import multer from "multer";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// ⚠️ importante pra serverless
app.use(express.json());

app.use(cors({
    origin: "*", // depois você pode restringir
}));

// 🔥 multer em memória (OBRIGATÓRIO na Vercel)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === "application/pdf") {
            cb(null, true);
        } else {
            cb(new Error("Apenas PDF"));
        }
    }
});

// 🔥 transporter (reutilizável)
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASS,
    },
});

// 🔥 função de envio
async function sendMail({
    to,
    subject,
    html,
    attachments = [],
    fromName = "Sistema",
}) {
    try {
        const info = await transporter.sendMail({
            from: `"${fromName}" <${process.env.EMAIL}>`,
            to,
            subject,
            html,
            attachments,
        });

        return {
            success: true,
            messageId: info.messageId,
        };

    } catch (error) {
        return {
            success: false,
            error: error.message,
        };
    }
}

// 🔥 ROTA CURRÍCULO
app.post("/curriculo", upload.single("curriculo"), async (req, res) => {
    try {
        const { nome, email } = req.body;
        const arquivo = req.file;

        if (!arquivo) {
            return res.status(400).json({ msg: "Arquivo obrigatório" });
        }

        const response = await sendMail({
            to: process.env.EMAIL,
            subject: "NOVO CURRÍCULO",
            fromName: "New World Cursos",
            html: `
                <h1>Nome: ${nome}</h1>
                <h1>Email: ${email}</h1>
            `,
            attachments: [
                {
                    filename: arquivo.originalname,
                    content: arquivo.buffer, // 🔥 AQUI MUDA (buffer)
                }
            ]
        });

        if (!response.success) {
            return res.status(500).json({ msg: response.error });
        }

        res.status(200).json({ msg: "ok" });

    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

// 🔥 ROTA MATRÍCULA
app.post("/matricula", async (req, res) => {
    try {
        const { nome, numero, curso } = req.body;

        if (!nome || !numero || !curso) {
            return res.status(400).json({ msg: "Dados incompletos" });
        }

        const response = await sendMail({
            to: process.env.EMAIL,
            subject: "NOVA MATRÍCULA",
            fromName: "New World Cursos",
            html: `
                <h1>Nova Matrícula</h1>
                <p><strong>Nome:</strong> ${nome}</p>
                <p><strong>Número:</strong> ${numero}</p>
                <p><strong>Curso:</strong> ${curso}</p>
            `,
        });

        if (!response.success) {
            return res.status(500).json({ msg: response.error });
        }

        return res.status(200).json({ msg: "Matrícula enviada com sucesso" });

    } catch (err) {
        return res.status(500).json({ msg: err.message });
    }
});

// 🔥 EXPORT PRA VERCEL
export default app;

// 🔥 MANTÉM LOCAL
const port = 4444;
app.listen(port, () => {
    console.log("http://localhost:" + port);
});