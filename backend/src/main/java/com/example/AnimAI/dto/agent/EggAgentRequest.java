package com.example.AnimAI.dto.agent;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

@Getter
@AllArgsConstructor
public class EggAgentRequest {

    @Getter
    @AllArgsConstructor
    public static class Message {
        private String speaker;  // "USER" | "EGG"
        private String message;
    }

    private List<Message> messages;
}
