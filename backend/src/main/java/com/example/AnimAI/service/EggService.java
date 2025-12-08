package com.example.AnimAI.service;

import com.example.AnimAI.domain.ConversationLog;
import com.example.AnimAI.domain.Egg;
import com.example.AnimAI.domain.User;
import com.example.AnimAI.dto.EggMessageResponse;
import com.example.AnimAI.dto.agent.EggAgentRequest;
import com.example.AnimAI.dto.agent.EggAgentResponse;
import com.example.AnimAI.repository.ConversationLogRepository;
import com.example.AnimAI.repository.EggRepository;
import com.example.AnimAI.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EggService {

    private final UserRepository userRepository;
    private final EggRepository eggRepository;
    private final ConversationLogRepository conversationLogRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${agent.base-url}")
    private String agentBaseUrl;

    public EggMessageResponse talkToEgg(Long userId, String userMessage) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // 유저의 '현재 부화 안 한 알' 가져오거나 새로 생성
        Egg egg = eggRepository.findByOwnerAndHatchedIsFalse(user)
                .orElseGet(() -> eggRepository.save(Egg.builder()
                        .owner(user)
                        .hatched(false)
                        .createdAt(LocalDateTime.now())
                        .build()
                ));

        // USER 메시지 저장
        ConversationLog userLog = conversationLogRepository.save(
                ConversationLog.builder()
                        .ownerId(user.getId())
                        .eggId(egg.getId())
                        .speaker("USER")
                        .message(userMessage)
                        .createdAt(LocalDateTime.now())
                        .build()
        );

        // 최근 대화 로그 가져와서 Agent에 전달
        List<ConversationLog> logs = conversationLogRepository.findByEggIdOrderByCreatedAtAsc(egg.getId());

        EggAgentRequest request = new EggAgentRequest(
                logs.stream()
                        .map(l -> new EggAgentRequest.Message(l.getSpeaker(), l.getMessage()))
                        .collect(Collectors.toList())
        );

        EggAgentResponse agentResponse = restTemplate.postForObject(
                agentBaseUrl + "/agent/egg-reply",
                request,
                EggAgentResponse.class
        );

        String reply = (agentResponse != null) ? agentResponse.getReply() : "음... 잘 이해하지 못했어 😅";

        // EGG 메시지 저장
        conversationLogRepository.save(
                ConversationLog.builder()
                        .ownerId(user.getId())
                        .eggId(egg.getId())
                        .speaker("EGG")
                        .message(reply)
                        .createdAt(LocalDateTime.now())
                        .build()
        );

        return new EggMessageResponse(egg.getId(), reply);
    }
}
