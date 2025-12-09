package com.example.animai.controller;

import com.example.animai.domain.User;
import com.example.animai.dto.auth.LoginRequest;
import com.example.animai.dto.auth.LoginResponse;
import com.example.animai.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173") // 프론트 주소에 맞춰 수정
public class AuthController {

    private final UserRepository userRepository;

    @PostMapping("/login")
    public LoginResponse login(@RequestBody LoginRequest request) {

        String email = request.getEmail();
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("email is required");
        }

        // 1) 이미 있는 유저면 그걸 사용
        return userRepository.findByEmail(email)
                .map(user -> new LoginResponse(
                        user.getId(),
                        user.getEmail(),
                        user.getNickname()
                ))
                // 2) 없으면 새로 만들어서 로그인처럼 동작
                .orElseGet(() -> {
                    String nickname = request.getNickname();
                    if (nickname == null || nickname.isBlank()) {
                        // 이메일 앞부분으로 대충 닉네임 생성
                        nickname = email.split("@")[0];
                    }

                    User newUser = User.builder()
                            .email(email)
                            .nickname(nickname)
                            .password(null) // 지금은 비번 안 씀 (MVP)
                            .createdAt(LocalDateTime.now())
                            .build();

                    User saved = userRepository.save(newUser);
                    return new LoginResponse(
                            saved.getId(),
                            saved.getEmail(),
                            saved.getNickname()
                    );
                });
    }
}
