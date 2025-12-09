package com.example.animai.service;

import com.example.animai.domain.ConversationLog;
import com.example.animai.domain.Egg;
import com.example.animai.domain.Pet;
import com.example.animai.domain.User;
import com.example.animai.dto.EggMessageResponse;
import com.example.animai.dto.agent.EggAgentRequest;
import com.example.animai.dto.agent.EggAgentResponse;
import com.example.animai.repository.ConversationLogRepository;
import com.example.animai.repository.EggRepository;
import com.example.animai.repository.PetRepository;
import com.example.animai.repository.UserRepository;
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
    private final PetRepository petRepository;

    private final RestTemplate restTemplate = new RestTemplate();

    // application.yml 에서 agent.base-url 설정 (없으면 기본값 localhost:4000)
    @Value("${agent.base-url:http://localhost:4000}")
    private String agentBaseUrl;

    /**
     * 알과 대화하는 메서드
     * - 유저의 '현재 부화 안 한 알'을 가져오거나 새로 만든다.
     * - USER 메시지를 ConversationLog 에 저장한다.
     * - 전체 로그를 agent 서버로 보낸다.
     * - agent 의 reply 를 받아 EGG 메시지로 저장한다.
     * - eggId + reply 를 프론트로 리턴한다.
     */
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
        conversationLogRepository.save(
                ConversationLog.builder()
                        .ownerId(user.getId())
                        .eggId(egg.getId())
                        .speaker("USER")
                        .message(userMessage)
                        .createdAt(LocalDateTime.now())
                        .build()
        );

        // 최근 대화 로그 가져와서 Agent에 전달
        List<ConversationLog> logs =
                conversationLogRepository.findByEggIdOrderByCreatedAtAsc(egg.getId());

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

        String reply = (agentResponse != null)
                ? agentResponse.getReply()
                : "음... 잘 이해하지 못했어 😅";

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

    /**
     * 알을 부화시키고 Pet 을 생성/저장하는 메서드
     * - userId, eggId 로 알을 찾고 owner 확인
     * - 이미 부화했다면 예외
     * - 해당 알의 전체 대화 로그를 기반으로 간단한 규칙으로 Pet 을 만든다.
     *   (나중에 agent 를 호출해서 AI 기반으로 만드는 걸로 확장 가능)
     */
    public Pet hatchEgg(Long userId, Long eggId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Egg egg = eggRepository.findById(eggId)
                .orElseThrow(() -> new IllegalArgumentException("Egg not found"));

        if (!egg.getOwner().getId().equals(user.getId())) {
            throw new IllegalStateException("이 알은 해당 유저의 것이 아닙니다.");
        }

        if (egg.isHatched()) {
            throw new IllegalStateException("이미 부화한 알입니다.");
        }

        // 이 알의 전체 대화 로그
        List<ConversationLog> logs =
                conversationLogRepository.findByEggIdOrderByCreatedAtAsc(egg.getId());

        // 간단한 규칙 기반으로 Pet 만들기 (MVP)
        Pet pet = buildPetFromConversation(egg, logs);

        // Egg 상태 업데이트
        egg.setHatched(true);
        egg.setHatchedAt(LocalDateTime.now());
        eggRepository.save(egg);

        // Pet 저장
        return petRepository.save(pet);
    }

    /**
     * 대화 로그를 보고 간단한 규칙으로 Pet 을 생성하는 helper 메서드.
     * (지금은 키워드 기반, 나중에 agent 호출로 교체 가능)
     */
    private Pet buildPetFromConversation(Egg egg, List<ConversationLog> logs) {
        String allText = logs.stream()
                .map(ConversationLog::getMessage)
                .collect(Collectors.joining(" "));

        String lower = allText.toLowerCase();

        String species;
        String personality;

        if (containsAny(lower, "숲", "나무", "초록", "forest")) {
            species = "숲속 여우";
            personality = "조용하고 따뜻한 숲의 향기를 닮은 여우예요. 자연을 좋아하는 당신과 잘 맞아요.";
        } else if (containsAny(lower, "바다", "물", "파도", "sea", "ocean")) {
            species = "바다 물고기";
            personality = "잔잔한 파도와 함께 떠다니는 여유로운 물고기예요. 감성이 풍부하고 차분한 성격이에요.";
        } else if (containsAny(lower, "불", "화염", "용", "드래곤", "불꽃", "fire")) {
            species = "작은 드래곤";
            personality = "불꽃처럼 뜨겁고 에너지가 넘치는 작은 드래곤이에요. 도전하는 걸 좋아하죠!";
        } else if (containsAny(lower, "하늘", "별", "우주", "sky", "star", "space")) {
            species = "별빛 고양이";
            personality = "밤하늘의 별빛을 머금은 고양이예요. 몽글몽글한 상상력이 가득한 친구예요.";
        } else {
            species = "수수께끼 생명체";
            personality = "아직 모든 것이 미지의 영역인 신비로운 존재예요. 앞으로 함께 지내면서 서서히 성격이 드러날 거예요.";
        }

        String name = "나만의 동물";

        return Pet.builder()
                .owner(egg.getOwner())
                .fromEgg(egg)
                .species(species)
                .name(name)
                .personality(personality)
                .createdAt(LocalDateTime.now())
                .build();
    }

    private boolean containsAny(String text, String... keywords) {
        for (String k : keywords) {
            if (text.contains(k.toLowerCase())) {
                return true;
            }
        }
        return false;
    }
}
