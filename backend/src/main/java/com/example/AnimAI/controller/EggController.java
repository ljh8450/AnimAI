package com.example.AnimAI.controller;

import com.example.aipet.dto.EggMessageRequest;
import com.example.aipet.dto.EggMessageResponse;
import com.example.aipet.service.EggService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/eggs")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173") // 개발용(프론트 주소)
public class EggController {

    private final EggService eggService;

    // 지금은 userId를 하드코딩/쿼리스트링 등으로 임시 처리 (나중에 JWT로 교체)
    @PostMapping("/{eggId}/messages")
    public EggMessageResponse talkToEgg(
            @PathVariable Long eggId,
            @RequestParam Long userId,
            @RequestBody EggMessageRequest body
    ) {
        return eggService.talkToEgg(userId, body.getMessage());
    }
}
