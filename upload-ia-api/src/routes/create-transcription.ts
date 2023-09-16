import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import { createReadStream } from "node:fs"
import { z } from 'zod'
import { openai } from "../lib/openai";

export async function createTranscriptionRoute(app: FastifyInstance) {
    app.post("/videos/:videoId/transcription", async (request, response) => {
        const paramsSchema = z.object({
            videoId: z.string().uuid()
        });
        const { videoId }  = paramsSchema.parse(request.params);

        const bodySchema = z.object({
            prompt: z.string(),
        });

        const { prompt } = bodySchema.parse(request.body);

        const video = await prisma.video.findUniqueOrThrow({
            where: {
                id: videoId
            }
        })
        
        const videoPath = video.path;
        const audioReadStream = createReadStream(videoPath);

        const res = await openai.audio.transcriptions.create({
            file: audioReadStream,
            model: 'whisper-1',
            language: 'pt',
            response_format: 'json',
            temperature: 0,
            prompt
        }).catch((err) => {
            return response.status(400).send({
                message: "Ocorreu um erro na comunicação com a API da OpenAI",
                error: err
            })
        })

        const transcription = res.text;

        await prisma.video.update({
            where: {
                id: videoId
            },
            data: {
                transcription
            }
        })

        return response.status(200).send({
            transcription
        })
    })
}