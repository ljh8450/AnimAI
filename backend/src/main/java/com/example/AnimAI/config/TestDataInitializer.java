package com.example.AnimAI.config;

import com.example.AnimAI.domain.User;
import com.example.AnimAI.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;

import java.time.LocalDateTime;

@Configuration
@RequiredArgsConstructor
public class TestDataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;

    @Override
    public void run(String... args) {
        if (userRepository.count() == 0) {
            User user = User.builder()
                    .email("test@example.com")
                    .password("test") // 나중에 반드시 바꾸자!
                    .nickname("테스트유저")
                    .createdAt(LocalDateTime.now())
                    .build();
            userRepository.save(user);
            System.out.println(">>> Test user created with id=" + user.getId());
        }
    }
}
