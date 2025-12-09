package com.example.animai.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Pet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    private Egg fromEgg;

    @ManyToOne
    private User owner;

    private String species;      // 예: 숲속 여우, 작은 용 등
    private String name;         // AI가 지어준 이름

    @Lob
    private String personality;  // 성격 설명 텍스트

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
